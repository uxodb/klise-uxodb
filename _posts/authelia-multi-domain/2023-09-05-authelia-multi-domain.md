---
title: "Multi Domain Protection with Authelia"
date: 2023-09-05
tags: [unix/linux, authelia, traefik, reverse proxy]
published: true
---

A little while back, I deployed <a href="https://www.authelia.com" target="_blank" rel="noopener">Authelia</a> for my services. If you haven't heard about Authelia, it is an authentication and authorization server capable of, for example: multi-factor authentication, <abbr title="Single sign-on">SSO</abbr>, <abbr title="OpenID Connect">OIDC</abbr>, and what's not unimportant, it isn't resource heavy. I use it to protect my services from being accessed without authentication and Authelia has the necessary access control to achieve this. 

At some point, while tinkering with Authelia, I introduced some changes which rendered one of my domains inaccesible. I really liked the modifications I made and instead of rolling it back, I decided to look for a solution.

## Running authelia and changes made
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
The access rules are set up, a `bypass` for service1.example.com, meaning there is no need for authentication by Authelia when accessing that domain, and `one_factor` for monitor.example.com which *does* require authentication when accessing it. The cookie's configuration has also been set. What is left is setting up a user account in Authelia, which I wont describe in detail, but I made a new user `uxodb`, generated the password and added it to `users_database.yml`.

Next we start up Authelia with:
```bash
$ docker compose up -d
```


Hierzo tekst blabla over hoe authelia draait, middleware, traefik config, en hoe ik achter multidomain kwam via authelia site en github issues/PR etc.
ook over /api endpoints

Ook dat je eerst multiple authelia instanties moest draaien voor multi-domain
