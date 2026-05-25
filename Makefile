.DEFAULT_GOAL := help

ARGS := $(filter-out run stop --, $(MAKECMDGOALS))
# Split argv: bare words → profiles; anything starting with `-` → forwarded to `up`.
# Example: `make run -- prod --build --force-recreate` passes prod as the profile
# and `--build --force-recreate` straight through to `docker compose up`.
PROFILES := $(filter-out -%,$(ARGS))
UP_FLAGS := $(filter -%,$(ARGS))

define build_profiles
$(foreach p,$(1),--profile $(p))
endef

# Compose only interpolates ${VAR} in the compose file itself from the shell,
# a root-level .env, or --env-file. Service-level env_file: only feeds the
# running container. Pass each app's .env explicitly so build args populate.
ENV_FILES := $(wildcard ./apps/*/.env)
ENV_FLAGS := $(foreach f,$(ENV_FILES),--env-file $(f))

.PHONY: help
help:
	@echo ""
	@echo "  Usage:"
	@echo "    make run  -- <profile1> [profile2 ...] [--flag ...]"
	@echo "    make stop -- <profile1> [profile2 ...]"
	@echo ""
	@echo "  Examples:"
	@echo "    make run  -- all"
	@echo "    make run  -- db analytics"
	@echo "    make run  -- prod --build --force-recreate"
	@echo "    make stop -- all"
	@echo "    make stop -- db analytics"
	@echo ""
	@echo "  Available targets:"
	@grep -E '^[a-zA-Z0-9._-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "    \033[36m%-22s\033[0m %s\n", $$1, $$2}'
	@echo ""


.PHONY: run
run: ## Stop then start containers  →  make run -- all  /  make run -- prod --build
ifeq ($(PROFILES),)
	$(error No profiles given. Usage: make run -- <profile1> [profile2 ...] [--flag ...])
endif
	$(eval PROFILE_FLAGS := $(call build_profiles,$(PROFILES)))
	@echo "→ Stopping:  docker compose $(ENV_FLAGS) $(PROFILE_FLAGS) down"
	docker compose $(ENV_FLAGS) $(PROFILE_FLAGS) down
	@echo "→ Starting:  docker compose $(ENV_FLAGS) $(PROFILE_FLAGS) up -d $(UP_FLAGS)"
	docker compose $(ENV_FLAGS) $(PROFILE_FLAGS) up -d $(UP_FLAGS)
	@echo "→ Service URLs:"
	@CONTAINERS=$$(docker compose $(ENV_FLAGS) $(PROFILE_FLAGS) ps -q); \
	if [ -n "$$CONTAINERS" ]; then \
		docker inspect -f '{{.Name}} |{{range $$p, $$conf := .NetworkSettings.Ports}}{{if $$conf}}  http://localhost:{{(index $$conf 0).HostPort}}{{end}}{{end}}' $$CONTAINERS \
			| sed 's/^\///' \
			| awk -F'|' '{ printf " \033[1;34m\033[0m  \033[1;32m%-25s\033[0m%s\n", $$1, $$2 }'; \
	fi


.PHONY: stop
stop: ## Stop containers  →  make stop -- all  /  make stop -- db analytics
ifeq ($(PROFILES),)
	$(error No profiles given. Usage: make stop -- <profile1> [profile2 ...])
endif
	$(eval PROFILE_FLAGS := $(call build_profiles,$(PROFILES)))
	@echo "→ Stopping:  docker compose $(ENV_FLAGS) $(PROFILE_FLAGS) down"
	docker compose $(ENV_FLAGS) $(PROFILE_FLAGS) down

.PHONY: show
show: ## Show running container URLs
	@printf "\033[1;34m\033[0m  \033[1mActive Services\033[0m\n"
	@CONTAINERS=$$(docker ps -q --filter "label=com.docker.compose.project.working_dir=$(PWD)"); \
	if [ -n "$$CONTAINERS" ]; then \
		docker inspect -f '{{.Name}} |{{range $$p, $$conf := .NetworkSettings.Ports}}{{if $$conf}}  http://localhost:{{(index $$conf 0).HostPort}}{{end}}{{end}}' $$CONTAINERS \
			| sed 's/^\///' \
			| awk -F'|' '{ printf " \033[1m\033[1;32m%-25s\033[0m%s\n", $$1, $$2 }'; \
	else \
		printf "  󰅖 No services currently running.\n"; \
	fi

.PHONY: migrate
migrate: ## Run server database migrations
	bun --filter server db:migrate

.PHONY: generate
generate: ## Generate server database types
	bun --filter server db:generate

.PHONY: db-reset
db-reset: ## Reset server database
	docker compose --profile db down -v

# Prevent make from treating profile names as unknown build targets
%:
	@: