# Dev deployment

Deployed on 2026-10-14 to https://dev.imobus.shop.

- Repository: https://github.com/fernandesthales/tasklists
- Application commit: `ddd6e46866eb2bc0199e70f835d6cd358147a81a`
- VPS: Ubuntu 24.04, x86-64, `187.77.250.85`
- Active source: `/opt/taskist/current` points to the commit directory under `/opt/taskist/releases/`.
- Compose project: `lab-dev`; app port: `127.0.0.1:3001`; PostgreSQL is not published.
- Server-only configuration: `/opt/taskist/config/dev.env`, mode 600.
- Nginx: `/etc/nginx/sites-enabled/dev.imobus.shop.conf`.
- Password protection covers the frontend and API. Shared username: `learner`.
- Credentials are NOT stored in Git. The initial access details were saved locally as `~/Downloads/taskist-dev-access.txt`.
- Existing booking stage/production and other server services were preserved. The older booking dev container remains available for rollback, but the dev hostname now routes to Taskist.

## Server commands

After connecting with your dedicated SSH key:

```bash
cd /opt/taskist/current
docker compose -p lab-dev --env-file /opt/taskist/config/dev.env ps
docker compose -p lab-dev --env-file /opt/taskist/config/dev.env logs --tail 100 app
bash scripts/backup-db.sh dev /opt/taskist/config/dev.env /var/backups/taskist/dev
```

## Verification

The image was built from the committed source on the VPS. Validation and API integration tests passed. HTTPS certificate validation passed; authenticated `/api/health` returned 200 and `environment: dev`. Anonymous requests to `/` and `/api/tasks` returned 401. Missing ACME challenge paths returned 404 instead of forwarding to the app.

The initial backup was restored successfully into a separate temporary PostgreSQL database, which was removed afterward. A copy was saved to the user's Mac as `~/Downloads/taskist-dev-initial-backup.dump`.

## Boundaries

This is a private learning workspace, with a fresh database separate from local development. It does not provide individual accounts or per-user task isolation. Stage and production have NOT been deployed for Taskist.

Deployment is currently manual. The GitHub workflow is committed, but no successful registry publication or automatic VPS deployment has been verified. Backups are currently manual; scheduled encrypted off-site backups and retention are not configured. Do not use this deployment for real users' production data yet.

## Rollback

The previous Nginx configuration is retained at `/root/.config/taskist/nginx-dev-before.conf`. To restore the former booking dev route, copy it back to the active dev configuration, run `nginx -t`, then reload Nginx. This does not revert Taskist database schema changes.

The TLS certificate is managed by the server's existing setup. Preserve the ACME challenge webroot and verify certificate renewal before expiry. CloudPanel changes may overwrite custom Nginx settings; recheck authentication after any panel edits.
