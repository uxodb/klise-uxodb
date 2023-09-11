---
title: "Multi Domain Protection with Authelia"
date: 2023-09-05 23:30:00 +0200
tags: [unix/linux, authelia, traefik, reverse proxy]
published: true
---

A little while back, I deployed <a href="https://www.authelia.com" target="_blank" rel="noopener">Authelia</a> for my services. If you haven't heard about Authelia, it is an authentication and authorization server capable of, for example: multi-factor authentication, <abbr title="Single sign-on">SSO</abbr>, <abbr title="OpenID Connect">OIDC</abbr>, and what's not unimportant, it isn't resource heavy. I use it to protect my services from being accessed without authentication and Authelia has the necessary access control to achieve this. 

At some point, while tinkering with Authelia, I introduced some changes which rendered one of my services inaccesible. I really liked the modifications I made and instead of rolling it back, I decided to look for a solution.

## Running Authelia
Authelia acts as a companion for reverse proxies, it receives a request and decides on allowing, denying or redirecting the request.To illustrate this, I've attached a simple diagram of the architecture below.
<figure>
<img src="/authelia-multi-domain/authelia-proxy.png" alt="Authelia Diagram">
<figcaption>Authelia working with the reverse proxy to decide on the request. </figcaption>
</figure>

In this case, the reverse proxy of choice is Traefik. So I run Authelia together with Traefik. The way this works is, you add Authelia as a middleware to your Traefik configuration and tie the middleware to your service(s). The Traefik docs explains about middlewares:
>Attached to the routers, pieces of middleware are a means of tweaking the requests before they are sent to your service (or before the answer from the services are sent to the clients). There are several available middleware in Traefik, some can modify the request, the headers, some are in charge of redirections, some add authentication, and so on.

Now, most of my services run in Docker, so I start out by writing my compose file `docker-compose.yml`:

```yaml
---
services:
  authelia:
    image: authelia/authelia:latest
    container_name: authelia
    volumes:
      - ${PWD}/authelia:/config
    networks:
      - proxy # Traefik network
    labels:
      - 'traefik.enable=true'
      - 'traefik.http.routers.authelia.rule=Host(`auth.${DOMAIN}`)' # Host for service
      - 'traefik.http.routers.authelia.tls=true' # Enabling TLS
      - 'traefik.http.routers.authelia.tls.certresolver=lets-encrypt'
      - 'traefik.http.routers.authelia.entryPoints=websecure'
      - 'traefik.http.middlewares.authelia.forwardauth.address=http://authelia:9091/api/verify?rd=https://auth.${DOMAIN}' # Setting up the middleware
      - 'traefik.http.middlewares.authelia.forwardauth.trustForwardHeader=true'
      - 'traefik.http.middlewares.authelia.forwardauth.authResponseHeaders=Remote-User,Remote-Groups,Remote-Name,Remote-Email'
    expose:
      - 9091
    restart: unless-stopped
    environment:
      - TZ=${TZ}

  redis-auth: # Database for Authelia sessions
    image: redis:latest
    container_name: redis-auth
    volumes:
      - ${PWD}/redis-auth/redis.conf:/etc/redis/redis.conf
      - ${PWD/redis-auth/data:/data
    networks:
      - proxy
    command: ["redis-server", "/etc/redis/redis.conf"]
    restart: unless-stopped
    environment:
      - TZ=${TZ}

networks:
  proxy:
    external: true
```
{: data-label="~/docker/authelia/docker-compose.yml"}
And to use it with another service, you simply add the following label to the container's compose file:
```
- traefik.http.routers.monitor.middlewares=authelia@docker
```
So we have set up the `docker-compose.yml` file for Authelia, added it as a middleware to the service, but we also need to write the configuration for Authelia and set some access rules, for example. 

*I won't go through the complete configuration, I will only display the parts I deem necessary for this post. You can find a complete configuration of Authelia on <a href="https://github.com/authelia/authelia" target="_blank" rel="noopener">github</a>*
```yaml
access_control:
  default_policy: deny
  rules:
    - domain: service1.example.com # example.com is the root domain, ${DOMAIN} in docker-compose.yml
      policy: bypass
    - domain: monitor.example.com
      policy: one_factor

session:
  secret: '%utM!qkTXEtzaJi#Lz7Noj2bqrU35AS!Kzz'

  cookies:
    - name: authelia_session
      domain: example.com # root domain which I refer to as ${DOMAIN} in docker-compose.yml
      expiration: 3600 # 1 hour
      inactivity: 300 # 5 minutes
```
{: data-label="/srv/authelia/configuration.yml"}
The access rules are set up, a `bypass` for service1.example.com, meaning there is no need for authentication by Authelia when accessing that domain, and `one_factor` for monitor.example.com which *does* require authentication when accessing it. The cookie's configuration has also been set. What is left is setting up a user account in Authelia, which I wont describe in detail, but I made a new user `uxodb`, generated the password and added it to `users_database.yml`.

Next we start up Authelia with:
```console
$ docker compose up -d
```
## Modifications made

After using Authelia for a short while, I came up with an idea. An idea which I thought would simplify stuff more. I decided that instead of adding Authelia as a middleware to all of my services I want to use Authelia with, I could add the middleware to my entrypoint in Traefik. This way, every service that sits behind this entrypoint takes advantage of Authelia.

All I had to do is, remove the middleware labels from my services' compose files and in my Traefik config add Authelia as a middleware on the entrypoint:
```toml
[entryPoints]
  [entryPoints.web]
    address = ":80"
    [entryPoints.web.http.redirections.entryPoint]
      to = "websecure"
      scheme = "https"
  [entryPoints.websecure]
    address = ":443"
    [entryPoints.websecure.http]
      middlewares = ["securityHeaders@file", "authelia@docker"] # Adding the Authelia middleware
```
{: data-label="/srv/traefik/data/traefik.toml"}
Once that was done, I modified the access rules in the Authelia configuration, which we've went over earlier. Then restart both Authelia and Traefik, because the entrypoints configuration doesnt reside in Traefik's dynamic config, which is capable of reloading after a change.
```console
$ cd ~/docker/traefik && docker compose up -d --force-recreate traefik
$ cd ~/docker/authelia && docker compose up -d --force-recreate authelia
```
I went on and tried accessing some of my subdomains to test the rules I set in Authelia's configuration, it all looked good to me. Now, I use Authelia with the root domain all of my services are set up with, but one. There is one domain which I didnt use as much but still ran a service. And after 20 minutes I tried accessing the domain but would get an error message. At that moment it dawned upon me that it must be a result of setting up Authelia on the entrypoint, as that service also makes use of the same entrypoint.

## Looking for a solution
After what happened before, I immediately went to look for a solution. I tried to find a way to exclude the middleware at router level. I stumbled upon a few posts from the <a href="https://community.traefik.io/t/how-to-overwrite-middleware-headers-attached-to-the-entrypoint/16698" target="_blank" rel="noopener">Traefik forums</a>, <a href="https://www.reddit.com/r/Traefik/comments/hqmpz5/how_to_negateremove_a_default_middleware/" target="_blank" rel="noopener">Reddit,</a> and <a href="https://github.com/traefik/traefik/issues/5630" target="_blank" rel="noopener">Github</a>. Going through all of these pages, it seemed more and more like it was impossible at the moment. A comment on the Github page sparked some hope within me, stating:
>I think they are doing some related work for v3.

So I tried looking into this some more and eventually found <a href="https://github.com/traefik/traefik/issues/8654" target="_blank" rel="noopener">this</a> Github issue where the same was discussed, but also had a comment from someone on the Traefik team stating:
>After discussing the proposal with the team, we have decided to close the issue.

And what he said, basically, was that the issue could only be addressed by doing a global refactoring of middlewares instead of adding a new option in the current configuration.

I gave up and stopped looking in Traefik's direction, I didn't completely lose hope yet and continued my journey in the search for a solution. 

Now, it was time to look into Authelia's direction. I began searching for some kind of multi domain support and found Authelia's Roadmap, and the <a href="https://www.authelia.com/roadmap/active/multi-domain-protection/" target="_blank" rel="noopener">page</a> which specifically mentions Multi Domain Protection. This was great news, the first of the stages was already done, which was "Decide on a Method". The next stages, "Decide on a Session Library" and "Initial Implementation" were still in progress, and the last stage "SSO Implementation" had not started yet. I notice next to the "in progress" flag under "Initial Implementation", there also is a "v4.38.0" flag. I remembered the version I was on at the moment was 4.37.5

I quickly head over to Authelia's github and look through the <abbr title="Pull Request">PR's</abbr>. I was very happy to find two relevant PR's, the <a href="https://github.com/authelia/authelia/pull/3754" target="_blank" rel="noopener">first</a> is the one implementing multiple domains, and the <a href="https://github.com/authelia/authelia/pull/4296" target="_blank" rel="noopener">second</a> is the one allowing for authz endpoint customization. I'll explain why the latter is important shortly.

These PR's were at the time already pushed to the `master` branch of the project, and the roadmap mentioned `v4.38.0`. While looking into this, I confirmed both PR's were implemented in the beta branch for v4.38.0 called `v4.38.0-beta2` and discovered there even was a docker image with this tag already, making it only easier  for me.

## Implementing the changes

It was time to finally implement these changes in my configuration and I started out by modifying my compose file. This was an easy task, as there really were only two lines in need of an edit:

```yml
image: authelia/authelia::v4.38.0-beta2 # Replacing the :latest tag
labels: # Replacing the address
  - 'traefik.http.middlewares.authelia.forwardauth.address=http://authelia:9091/api/authz/forward-auth'
```
{: data-label="~/docker/authelia/docker-compose.yml"}

There's something which needs an explanation. The label in my original compose file contains the address to Authelia's portal, like this: `/api/verify?rd=https://auth.${DOMAIN}`. The new label contains no such thing, and here's why: The second PR I mentioned earlier, saying that I would explain why it is important, allows us to customize the endpoint. It really synergizes with the PR for multi domain support.

When using multiple domains with Authelia, customizing the endpoint means you can seperate both domains and not redirect requests from `domain2.com` to `auth.domain1.com`. In my first compose file the address was hardcoded in the label, meaning if I were to keep that address in and add my second domain to Authelia, requests to my second domain would redirect to the hardcoded address which contains the initial domain. By leaving out the domain in the label, we now can configure that part in the Authelia configuration instead and that way we can match the domains to the portal. And the latter PR allows us to do so.

The compose file has been modified, next is the Authelia configuration.

```yml

```
{: data-label="/srv/authelia/configuration.yml"}


