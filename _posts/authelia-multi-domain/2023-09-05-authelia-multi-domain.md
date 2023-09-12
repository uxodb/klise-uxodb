---
title: "Multi Domain Protection with Authelia"
date: 2023-09-05 23:30:00 +0200
tags: [unix/linux, authelia, traefik, reverse proxy]
published: true
---
A little while ago, I deployed <a href="https://www.authelia.com" target="_blank" rel="noopener">Authelia</a> for my services. In case you're unfamiliar with  Authelia, it is an authentication and authorization server capable of, for example: multi-factor authentication, <abbr title="Single sign-on">SSO</abbr>, <abbr title="OpenID Connect">OIDC</abbr>, and what's not unimportant, it isn't resource heavy. I employ Authelia to protect my services from being accessed without authentication and Authelia has the necessary access control to achieve this. 

At some point, while tinkering with Authelia, I introduced some changes which rendered one of my services inaccessible. I really liked the modifications I made and instead of rolling them back, I decided to look for a solution.

## Running Authelia
Authelia acts as a companion for reverse proxies, it's responsible for evaluating  requests and determines whether to allow, deny or redirect the request.To illustrate this, I've attached a basic diagram of the architecture below.
<figure>
<img src="/authelia-multi-domain/authelia-proxy.png" alt="Authelia Diagram">
<figcaption>Authelia working with the reverse proxy to evaluate the incoming request. </figcaption>
</figure>

In my case, the reverse proxy of choice is Traefik. So I run Authelia alongside Traefik. The way this works is, you add Authelia as a middleware to your Traefik configuration and tie the middleware to your service(s). The Traefik docs explains about middlewares:
>Attached to the routers, pieces of middleware are a means of tweaking the requests before they are sent to your service (or before the answer from the services are sent to the clients). There are several available middleware in Traefik, some can modify the request, the headers, some are in charge of redirections, some add authentication, and so on.

Now, most of my services are containerized with Docker, so I start out by writing my compose file, `docker-compose.yml`.

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
{:data-label="~/docker/authelia/docker-compose.yml"}

And to use it with another service, you simply add the following label to the container's compose file:
```
- traefik.http.routers.monitor.middlewares=authelia@docker
```
We've now configured the `docker-compose.yml` file for Authelia, added it as a middleware to the service, but we also need to set up Authelia's configuration and set the access rules.

*I won't go into the entire configuration's possibilities, I will only display the parts I deem necessary for this post. You can find a complete configuration of Authelia on <a href="https://github.com/authelia/authelia" target="_blank" rel="noopener">Github</a>*.
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
The access rules have been configured, a `bypass` for `service1.example.com`, meaning there is no need for authentication by Authelia when accessing that domain and a `one_factor` for `monitor.example.com`, which *does* require authentication when accessing it. The cookie's configuration has also been set. The only remaining task is to create a user account in Authelia, which I wont describe in detail, but I made a new user `uxodb`, generated the password and added it to `users_database.yml`.

Next, we start up the Authelia container.
```console
$ docker compose up -d
[+] Running 1/1
 ✔ Container authelia  Started
```
{:data-label="uxodb@nozarashi:~/docker/authelia"}
It seems to work well and the access rules are enforced.
## Adding middleware to entrypoint

After using Authelia for a short while, I came up with an idea. An idea which I thought would make it easier on me. I decided that instead of individually adding Authelia as a middleware to each of my services I want to secure, I could add the middleware to my entrypoint in Traefik. This way, every service that sits behind this entrypoint will benefit from Authelia.

All I needed to do is, remove the middleware labels from my services' compose files and within my Traefik configuration add Authelia as a middleware for the entrypoint:
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
Once that was done, I modified the access rules in the Authelia configuration, which we've went over earlier. Then, I restart both Authelia and Traefik, because the entrypoints' configuration doesnt reside in Traefik's dynamic configuration, which is capable of hot reloading after a change.
```console
$ cd ~/docker/traefik && docker compose up -d --force-recreate traefik
[+] Running 1/1
 ✔ Container traefik  Started
$ cd ~/docker/authelia && docker compose up -d --force-recreate authelia
[+] Running 1/1
 ✔ Container authelia  Started
```
{:data-label="uxodb@nozarashi:~"}
I proceeded test the rules I set in Authelia's configuration by attempting to access some of the subdomains, it appeared to function as expected. Now, I use Authelia with the root domain all of my services are set up with, but one. There is one domain which I didnt use as much but still host a service on. And Moments later, when I tried accessing the domain I would get an error message. At that moment it dawned on me that it must be a result of setting up Authelia on the entrypoint, as that service also listens on same entrypoint.

## Looking for a solution
I contemplated the situation for a moment and I immediately started looking for a solution. I tried to find a way to exclude middlewares at the router level. I stumbled upon a few posts from the <a href="https://community.traefik.io/t/how-to-overwrite-middleware-headers-attached-to-the-entrypoint/16698" target="_blank" rel="noopener">Traefik forums</a>, <a href="https://www.reddit.com/r/Traefik/comments/hqmpz5/how_to_negateremove_a_default_middleware/" target="_blank" rel="noopener">Reddit,</a> and <a href="https://github.com/traefik/traefik/issues/5630" target="_blank" rel="noopener">Github</a>. As I navigated through these pages, it increasingly appeared to be impossible. A comment on the Github page sparked some hope within me, it stated the following:
>I think they are doing some related work for v3.

So I tried looking into this some more and eventually found <a href="https://github.com/traefik/traefik/issues/8654" target="_blank" rel="noopener">this</a> Github issue where the same was discussed, but also had a comment from a Traefik employee stating:
>After discussing the proposal with the team, we have decided to close the issue.

Basically, he said that the issue could only be addressed by doing a global refactoring of middlewares rather than introducing a new option to the current configuration.

I gave up and stopped looking in Traefik's direction. I was not ready to give up completely yet and continued my journey in the search for a solution, now focusing on Authelia.

I began searching for some kind of multi domain support and stumbled upon Authelia's Roadmap which contained <a href="https://www.authelia.com/roadmap/active/multi-domain-protection/" target="_blank" rel="noopener">page</a> dedicated to Multi Domain Protection. This was great news. The first of the stages was already done, which was *Decide on a Method*. The subsequent stages, *Decide on a Session Library* and *Initial Implementation*, were still in progress. The final stage, *SSO Implementation*, had not started yet. I noticed next to the `in progress` flag under *Initial Implementation*, there also was a `v4.38.0` flag. I recalled the version I was on at the moment was 4.37.5.

I quickly head over to Authelia's Github repository and look through the <abbr title="Pull Request">PR's</abbr>. I was very happy to find two relevant PR's, the <a href="https://github.com/authelia/authelia/pull/3754" target="_blank" rel="noopener">first</a> implements multiple domains, while the <a href="https://github.com/authelia/authelia/pull/4296" target="_blank" rel="noopener">second</a> is the one allowing for <abbr title="Authorization">AuthZ</abbr> endpoint customization. I'll explain why the latter is important shortly.

These PR's had already been merged into the `master` branch of the project, and the roadmap mentioned `v4.38.0`. While looking into this, I verified both PR's were implemented in the beta branch for v4.38.0 called `v4.38.0-beta2` and discovered there even was a docker image with this same tag already, making it only easier on me.

## Implementing the changes

It was time to finally implement these changes in my configuration and I started out by modifying my compose file. This was an 
easy task, as really only two lines had to be modified.

```yml
image: authelia/authelia::v4.38.0-beta2 # Replacing the :latest tag
labels: # Replacing the address
  - 'traefik.http.middlewares.authelia.forwardauth.address=http://authelia:9091/api/authz/forward-auth'
```
{: data-label="~/docker/authelia/docker-compose.yml"}

The last line needs an explanation. The label in my original compose file contains the address to Authelia's portal, like this: `/api/verify?rd=https://auth.${DOMAIN}`. The new label omits this part, and here's why: The second PR I mentioned earlier, the one I promised to explain the importance of, allows us to customize the endpoint. It really synergizes with the PR for multi domain support.

I discovered how this worked only after reading the comment in the compose example displayed on this <a href="https://63d0d5401d3c4f000924ea89--authelia-staging.netlify.app/integration/proxies/traefik/" target="_blank" rel="noopener">*Deploy Preview*</a> page. If you expand the first `docker-compose.yml` example, it specifically states:
> The following commented line is for configuring the Authelia URL in the proxy. We strongly suggest this is configured in the Session Cookies section of the Authelia configuration.

Additionally, the relevant labels from the same example look like this:
```yaml
'traefik.http.middlewares.authelia.forwardAuth.address=http://authelia:9091/api/authz/forward-auth'
#'traefik.http.middlewares.authelia.forwardAuth.address=http://authelia:9091/api/authz/forward-auth?authelia_url=https%3A%2F%2Fauth.example.com%2F'
```
As you can see the label which has the portal's address hardcoded in is commented out.

When using multiple domains with Authelia, customizing the endpoint means you can seperate both domains and avoid redirecting requests from `domain2.com` to `auth.example.com`. In my initial compose file the address was hardcoded in the label, meaning if I were to keep that address in and add my second domain to Authelia, requests to my second domain would redirect to the hardcoded address which contains the initial domain. By leaving out the domain in the label, as is suggested in the previous quote,  we now can configure that part in the Authelia configuration instead and that way we can match the domains to the portal.

Having modified the compose file, next is the Authelia configuration.

```yml

```
{: data-label="/srv/authelia/configuration.yml"}


