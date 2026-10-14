# Taskist · Docker Lab

A Todoist-inspired personal task workspace built with React, a Node.js API, and PostgreSQL. Start with the local lessons below; VPS deployment is a later lesson once your server OS, domain, and repository are known.

## App features

- Inbox, Today (including overdue tasks), Upcoming with a week picker, Priorities, All tasks, and Completed.
- Add and edit tasks with descriptions, due dates, four priority levels, and project assignment.
- Create and rename projects with custom colors.
- Search titles, descriptions, and project names; sort by priority, due date, name, or newest first.
- Complete/reopen tasks, delete tasks, and undo completion or deletion.
- Responsive sidebar, accessible modal forms, and keyboard shortcuts: `Q` adds a task, `Cmd/Ctrl+K` searches, and `Esc` closes a dialog.

Taskist is an independent learning app inspired by Todoist. It is a single shared workspace, not a full reproduction of Todoist: accounts, collaboration, recurring tasks, reminders, and billing are not included.

## Database upgrades

The backend runs `api/db.js` before starting the HTTP server. It tracks applied versions in `schema_migrations` and applies SQL inside a transaction with an advisory lock. Migration 001 adds the new task fields and projects without removing existing tasks or volumes. Dates are returned as calendar dates, avoiding UTC date shifts. Deleted tasks are soft-deleted; Undo restores them.

## Verify changes

```bash
npm test
docker compose -p lab-dev --env-file environments/dev.env exec -T app node --input-type=module < scripts/smoke-test.mjs
```

The integration test creates temporary records, checks task/project behavior and migration idempotence, and removes only its own test records. Run it on the local dev environment.

## 1. Prepare local configuration

Run from this directory:

```bash
cp environments/dev.env.example environments/dev.env
cp environments/stage.env.example environments/stage.env
cp environments/prod.env.example environments/prod.env
```

These example passwords are for local learning. Before a VPS deployment, choose a different strong password for each environment. The real `.env` files are ignored by Git and excluded from Docker's build context. Do not commit them. Changing a password in the file does not change the password of an existing PostgreSQL database; rotate it inside PostgreSQL too.

## 2. Build and start dev

```bash
docker compose -p lab-dev --env-file environments/dev.env up -d --build --wait
```

Open http://localhost:3001 and add a task.

- `Dockerfile` describes how to build the application image.
- The first build stage compiles React. The second stage runs Node as a non-root user.
- `compose.yaml` describes two services: `app` and `db`.
- `-p lab-dev` names this Compose project. Its network and database volume belong to that project.
- `--env-file` supplies values for `${...}` in Compose. The `environment` block passes selected values into containers.
- `PGHOST=db` uses Compose DNS to find the database by its service name.
- Port 3001 on your Mac maps to port 3000 in the app container. PostgreSQL has no published host port.
- `APP_ENV` labels the deployment. `NODE_ENV=production` controls Node's runtime mode in every deployment, including the shared dev environment.

## 3. Inspect what is running

```bash
docker compose -p lab-dev --env-file environments/dev.env ps
docker compose -p lab-dev --env-file environments/dev.env logs -f app
```

Press Ctrl+C to stop following logs; the containers keep running.

Inspect the database directly:

```bash
docker compose -p lab-dev --env-file environments/dev.env exec db psql -U tasks -d tasks -c 'SELECT * FROM tasks;'
```

## 4. Prove persistence

Add a task in the browser, then run:

```bash
docker compose -p lab-dev --env-file environments/dev.env down
docker compose -p lab-dev --env-file environments/dev.env up -d --wait
```

Refresh the page. Your task remains because PostgreSQL stores data in a named volume, outside the container's writable layer. `down --volumes` deletes that database volume; use it only when intentionally resetting disposable data.

## 5. Run stage and prod locally

Use the image you already built:

```bash
docker compose -p lab-stage --env-file environments/stage.env up -d --no-build --wait
docker compose -p lab-prod --env-file environments/prod.env up -d --no-build --wait
```

| Environment | Local URL | Project |
| --- | --- | --- |
| Dev | http://localhost:3001 | lab-dev |
| Stage | http://localhost:3002 | lab-stage |
| Prod simulation | http://localhost:3003 | lab-prod |

Add different tasks in each environment. The lists should remain separate. These are three local deployments, not public VPS deployments.

## 6. GitHub and VPS deployment: next lesson

The intended pipeline is:

1. Merge changes into `develop`.
2. GitHub Actions tests the app and builds an image tagged with the commit SHA.
3. Push the image to GitHub Container Registry (GHCR).
4. Deploy that image to dev.
5. Select its immutable image digest for stage testing.
6. Promote that same digest to prod after approval.

The initial `docker-lab:local` tag is a local teaching convenience. On the VPS, set `APP_IMAGE` to `ghcr.io/OWNER/REPOSITORY@sha256:DIGEST`, then use `docker compose ... pull` followed by `docker compose ... up -d --no-build --wait`. Build an image for the VPS CPU architecture in CI, rather than copying a Mac image blindly.

On the VPS, keep these loopback port bindings and place a host reverse proxy with HTTPS in front of them. Route dev, stage, and prod domains to ports 3001, 3002, and 3003 respectively. One VPS shares hardware and downtime across environments; Compose project separation is not a separate machine or a strong security boundary.

This teaching app has no authentication. Protect access before exposing it publicly. Before using it for real production data, add migrations, database backup/restore testing, resource limits, and an access model. Rolling back an application image does not roll back a database migration. GitHub automation and VPS configuration are not yet included because the repository and server details are still needed.

## Source map

- `web/src/main.jsx`: React interface and API requests.
- `api/server.js`: API, parameterized SQL queries, and static file serving.
- `api/db.js` and `api/migrations/`: versioned database migration runner and SQL.
- `api/validation.js`: server-side field validation.
- `Dockerfile`: multi-stage image build.
- `compose.yaml`: services, health checks, network, and persistent database.
- `environments/*.env.example`: local deployment settings.

References: [Compose project names](https://docs.docker.com/compose/how-tos/project-name/), [Compose interpolation](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/), [Docker builds in GitHub Actions](https://docs.docker.com/build/ci/github-actions/).
