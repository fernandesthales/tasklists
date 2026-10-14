# Deployment preparation

Deployment is not yet configured on GitHub or Hostinger. These files prepare the build and backup steps without assuming SSH access, repository ownership, or available domain names.

## GitHub

`.github/workflows/ci.yml` builds the image, starts an isolated PostgreSQL stack, runs validation and API tests, and cleans up the disposable stack. Pushes to `main` or `develop` publish the tested image to `ghcr.io/<owner>/<repository>:<commit-sha>` using the workflow's GitHub token. The workflow summary contains the immutable image digest for promotion. Pull requests never publish an image.

The workflow builds Linux amd64, matching an x86-64 VPS. Confirm `uname -m` on the VPS before first deployment; an ARM VPS requires an ARM runner or a separate multi-platform build strategy.

For a private registry image, configure a read-only registry credential on the VPS through an interactive login or secret manager. Never put it in a repository file or chat. Source publication, CI execution, registry publishing, and VPS deployment still need to be verified independently.

## Database backups

```bash
bash scripts/backup-db.sh prod /secure/path/prod.env /secure/backup/path
```

The script writes a PostgreSQL custom-format dump with restrictive permissions and verifies that the archive can be read. It does not schedule jobs, upload off-site, apply retention, or prove that a full restore works. Before accepting production user data, configure encrypted off-site storage and test a restore into a separate disposable database. Keep dumps out of Git and Docker build contexts.

## Deployment prerequisites

- Confirm the GitHub repository and privacy setting.
- Confirm VPS SSH address, existing workloads/proxy, architecture, memory, and free disk.
- Confirm DNS availability for dev.imobus.shop, stage.imobus.shop, and app.imobus.shop.
- Choose private shared-workspace password protection or implement individual accounts and data ownership before real users.
- Configure separate production credentials and limited database roles.
- Configure HTTPS, off-site backups, restoration, and migration/rollback procedures.

Do not treat the existing local passwords or current shared workspace as a production user system. No deployment automation should expose this app until access control is in place.
