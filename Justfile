set shell := ["bash", "-euo", "pipefail", "-c"]

_envs := `for f in apps/*/.env; do [[ -e $f ]] && printf -- '--env-file %s ' "$f"; done; true`
_compose := "docker compose " + _envs
_prod := _compose + "-f docker-compose.yaml -f docker-compose.prod.yaml --profile prod"

[private]
default:
    @just --list --list-heading $'\n\033[1;96mJPA\033[0m \033[2m/ Available Commands\033[0m\n' --list-prefix $'  \033[36m›\033[0m '

[private]
_say kind msg:
    @case '{{ kind }}' in \
       ok)   printf '\033[42m\033[30m  OK  \033[0m \033[32m%b\033[0m\n' '{{ msg }}' ;; \
       fail) printf '\033[41m\033[30m FAIL \033[0m \033[31m%b\033[0m\n' '{{ msg }}' ;; \
       boot) printf '\033[43m\033[30m BOOT \033[0m \033[33m%b\033[0m\n' '{{ msg }}' ;; \
       pull) printf '\033[43m\033[30m PULL \033[0m \033[33m%b\033[0m\n' '{{ msg }}' ;; \
       bld)  printf '\033[43m\033[30m BLD  \033[0m \033[33m%b\033[0m\n' '{{ msg }}' ;; \
       stop) printf '\033[41m\033[30m STOP \033[0m \033[31m%b\033[0m\n' '{{ msg }}' ;; \
       db)   printf '\033[43m\033[30m  DB  \033[0m \033[33m%b\033[0m\n' '{{ msg }}' ;; \
       wipe) printf '\033[41m\033[30m  DB  \033[0m \033[31m%b\033[0m\n' '{{ msg }}' ;; \
     esac

[private]
_prep:
    @docker network create clashwithjpa-network >/dev/null 2>&1 || true

# Start local services, e.g. `just up db` (defaults to all)
up *profiles="all": _prep
    @just _say boot "Starting services"
    @{{ _compose }}{{ replace_regex(profiles, '(\S+)', '--profile ${1}') }} up -d --wait
    @just _say ok "Services ready"

# Stop local services, e.g. `just down db` (defaults to all)
down *profiles="all":
    @just _say stop "Stopping services"
    @{{ _compose }}{{ replace_regex(profiles, '(\S+)', '--profile ${1}') }} down
    @just _say ok "Services stopped"

# ── Database ──────────────────────────────────────────────────────────────────

# Generate a migration from schema changes
db-generate name="":
    @just _say db "Generating migration"
    @pnpm --filter server db:generate {{ if name == "" { "" } else { "--name " + name } }}
    @just _say ok "Migration created"

# Apply all pending migrations
db-migrate:
    @just _say db "Applying migrations"
    @pnpm --filter server db:migrate
    @just _say ok "Database up to date"

# Drop the local database and its volume
db-reset:
    @just _say wipe "Resetting database"
    @{{ _compose }}--profile db down -v
    @just _say ok "Database reset"

# ── Deploy ────────────────────────────────────────────────────────────────────

# Pull latest, rebuild, and deploy the production stack (--down to stop it instead)
prod *args: _prep
    #!/usr/bin/env bash
    set -euo pipefail
    if [[ "{{ args }}" == *--down* ]]; then
        just _say stop "Stopping production stack"
        {{ _prod }} down
        just _say ok "Production stack stopped"
        exit 0
    fi
    just _say pull "Pulling latest"
    git pull --ff-only
    just _say bld "Building images"
    {{ _prod }} build
    just _say boot "Deploying services"
    # --wait fails the deploy when a container never turns healthy.
    {{ _prod }} up -d --remove-orphans --pull missing --wait --wait-timeout 180
    docker image prune -f >/dev/null
    just _say ok "Deployed"
