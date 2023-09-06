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


Hierzo tekst blabla over hoe authelia draait, middleware, traefik config, en hoe ik achter multidomain kwam via authelia site en github issues/PR etc.
ook over /api endpoints

Ook dat je eerst multiple authelia instanties moest draaien voor multi-domain
