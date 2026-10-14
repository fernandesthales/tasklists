# Hostinger VPS lesson plan

Target: Ubuntu 24.04, using subdomains of `imobus.shop`.

| Proposed hostname | Host loopback port | Compose project |
| --- | --- | --- |
| dev.imobus.shop | 3001 | lab-dev |
| stage.imobus.shop | 3002 | lab-stage |
| app.imobus.shop | 3003 | lab-prod |

Confirm these hostnames are unused before adding DNS records. Keep the root domain's existing website intact. Each subdomain needs an A record pointing at the VPS public IPv4 address. Add AAAA records only if IPv6 is configured and reachable.

## Server prerequisites

Use [Docker Engine's Ubuntu installation guide](https://docs.docker.com/engine/install/ubuntu/), including the Compose plugin. Ubuntu 24.04 is supported. Inspect existing Docker installations and workloads before changing packages. On the VPS, Docker Engine runs as a service; Docker Desktop is used on your Mac.

The deployment needs the repository URL, VPS SSH user and address, and an available reverse proxy. Do not share passwords or private SSH keys in chat. Before changing the server, inspect which services already use ports 80 and 443. Reuse an existing proxy where appropriate.

## Routing

A host-installed Caddy can route domains to these loopback ports and manage HTTPS. This example assumes Caddy runs directly on Ubuntu, not in a separate container. A container's `127.0.0.1` refers to that container itself.

Example site block, to be integrated with the existing proxy configuration:

```caddyfile
dev.imobus.shop {
    basic_auth {
        learner REPLACE_WITH_CADDY_PASSWORD_HASH
    }
    reverse_proxy 127.0.0.1:3001
}
```

Create analogous stage and app blocks using ports 3002 and 3003. Generate a password hash interactively with `caddy hash-password`; replace the placeholder before validating the configuration. Protect all three instances while the teaching app lacks its own authentication. Caddy needs functioning DNS and inbound access to ports 80 and 443 for the usual automatic HTTPS setup. Preserve SSH access when configuring firewalls. Do not publish PostgreSQL or the app's 3001–3003 ports publicly.

References: [Caddy reverse proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy), [Caddy basic authentication](https://caddyserver.com/docs/caddyfile/directives/basic_auth).

## GitHub release flow

Start with a repository and a `develop` integration branch. A CI workflow will build and publish a commit-tagged image to GHCR. Dev can deploy successful builds automatically; stage and prod should select the exact built image digest. Keep registry access and SSH credentials in GitHub secrets, environment credentials only on the server, and approval rules in GitHub environments when available for the repository's plan.

No DNS, GitHub, or VPS changes have been made by this starter project. Implementing the actual workflow is the next lesson after the local container and persistence exercises.
