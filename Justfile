set shell := ["bash", "-euo", "pipefail", "-c"]

[private]
default:
    @just --list --list-heading $'\n\033[1;96mJPA\033[0m \033[2m/ Available Commands\033[0m\n' --list-prefix $'  \033[36m›\033[0m '

# ── Services ──────────────────────────────────────────────────────────────────

# Stop then start containers  →  just run all  /  just run prod --build
run *args:
    #!/usr/bin/env bash
    set -euo pipefail
    # Bare words → profiles; `-` flags → forwarded to `docker compose up`
    profiles=(); upflags=()
    for a in {{args}}; do
        if [[ $a == -* ]]; then upflags+=("$a"); else profiles+=("$a"); fi
    done
    if [[ ${#profiles[@]} -eq 0 ]]; then
        printf '\033[41m\033[30m ERR  \033[0m \033[31mNo profiles given.\033[0m Usage: just run <profile1> [profile2 ...] [--flag ...]\n' >&2
        exit 1
    fi
    env_flags=(); for f in ./apps/*/.env; do [[ -e $f ]] && env_flags+=(--env-file "$f"); done
    profile_flags=(); for p in "${profiles[@]}"; do profile_flags+=(--profile "$p"); done
    # `prod` profile layers docker-compose.prod.yaml on top of the base file
    compose_files=()
    for p in "${profiles[@]}"; do [[ $p == prod ]] && compose_files=(-f docker-compose.yaml -f docker-compose.prod.yaml); done
    compose=(docker compose "${compose_files[@]}" "${env_flags[@]}" "${profile_flags[@]}")
    printf '\033[41m\033[30m STOP \033[0m \033[31mStopping services\033[0m\n'
    "${compose[@]}" down
    printf '\033[43m\033[30m BOOT \033[0m \033[33mStarting services\033[0m\n'
    "${compose[@]}" up -d "${upflags[@]}"
    printf '\033[42m\033[30m  OK  \033[0m \033[32mServices ready\033[0m\n'
    containers=$("${compose[@]}" ps -q)
    if [[ -n "$containers" ]]; then
        printf '\033[44m\033[30m URLS \033[0m \033[34mService endpoints\033[0m\n'
        docker inspect -f '{{{{.Name}} |{{{{range $p, $conf := .NetworkSettings.Ports}}{{{{if $conf}}  http://localhost:{{{{(index $conf 0).HostPort}}{{{{end}}{{{{end}}' $containers \
            | sed 's/^\///' \
            | awk -F'|' '{ printf "        \033[1;32m%-25s\033[0m%s\n", $1, $2 }'
    fi

# Stop containers  →  just stop all  /  just stop db analytics
stop *args:
    #!/usr/bin/env bash
    set -euo pipefail
    profiles=()
    for a in {{args}}; do
        [[ $a == -* ]] || profiles+=("$a")
    done
    if [[ ${#profiles[@]} -eq 0 ]]; then
        printf '\033[41m\033[30m ERR  \033[0m \033[31mNo profiles given.\033[0m Usage: just stop <profile1> [profile2 ...]\n' >&2
        exit 1
    fi
    env_flags=(); for f in ./apps/*/.env; do [[ -e $f ]] && env_flags+=(--env-file "$f"); done
    profile_flags=(); for p in "${profiles[@]}"; do profile_flags+=(--profile "$p"); done
    compose_files=()
    for p in "${profiles[@]}"; do [[ $p == prod ]] && compose_files=(-f docker-compose.yaml -f docker-compose.prod.yaml); done
    printf '\033[41m\033[30m STOP \033[0m \033[31mStopping services\033[0m\n'
    docker compose "${compose_files[@]}" "${env_flags[@]}" "${profile_flags[@]}" down

# Show running container URLs
show:
    #!/usr/bin/env bash
    set -euo pipefail
    printf '\033[44m\033[30m INFO \033[0m \033[34mActive Services\033[0m\n'
    containers=$(docker ps -q --filter "label=com.docker.compose.project.working_dir=$PWD")
    if [[ -n "$containers" ]]; then
        docker inspect -f '{{{{.Name}} |{{{{range $p, $conf := .NetworkSettings.Ports}}{{{{if $conf}}  http://localhost:{{{{(index $conf 0).HostPort}}{{{{end}}{{{{end}}' $containers \
            | sed 's/^\///' \
            | awk -F'|' '{ printf "        \033[1;32m%-25s\033[0m%s\n", $1, $2 }'
    else
        printf '\033[43m\033[30m WARN \033[0m \033[33mNo services currently running\033[0m\n'
    fi

# ── Database ──────────────────────────────────────────────────────────────────

# Run server database migrations
migrate:
    @printf '\033[43m\033[30m  DB  \033[0m \033[33mRunning migrations\033[0m\n'
    @bun --filter server db:migrate
    @printf '\033[42m\033[30m  OK  \033[0m \033[32mDatabase up to date\033[0m\n'

# Generate server database types
generate:
    @printf '\033[43m\033[30m  DB  \033[0m \033[33mGenerating types\033[0m\n'
    @bun --filter server db:generate
    @printf '\033[42m\033[30m  OK  \033[0m \033[32mTypes generated\033[0m\n'

# Reset server database
db-reset:
    @printf '\033[41m\033[30m  DB  \033[0m \033[31mResetting database\033[0m\n'
    @docker compose --profile db down -v
    @printf '\033[42m\033[30m  OK  \033[0m \033[32mDatabase reset\033[0m\n'

# ── Deploy ────────────────────────────────────────────────────────────────────

# Stop, pull latest, then rebuild and redeploy the prod stack
prod:
    @printf '\033[43m\033[30m PROD \033[0m \033[33mDeploying prod stack\033[0m\n'
    @just stop prod
    @printf '\033[43m\033[30m PULL \033[0m \033[33mPulling latest changes\033[0m\n'
    @git pull
    @printf '\033[42m\033[30m PULL \033[0m \033[32mRepository up to date\033[0m\n'
    @just run prod --build --force-recreate
    @printf '\033[42m\033[30m DONE \033[0m \033[32mProd deployed\033[0m\n'
