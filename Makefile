.DEFAULT_GOAL := help

ARGS := $(filter-out run stop --, $(MAKECMDGOALS))

define build_profiles
$(foreach p,$(1),--profile $(p))
endef

.PHONY: help
help:
	@echo ""
	@echo "  Usage:"
	@echo "    make run  -- <profile1> [profile2 ...]"
	@echo "    make stop -- <profile1> [profile2 ...]"
	@echo ""
	@echo "  Examples:"
	@echo "    make run  -- all"
	@echo "    make run  -- db analytics"
	@echo "    make stop -- all"
	@echo "    make stop -- db analytics"
	@echo ""
	@echo "  Available targets:"
	@grep -E '^[a-zA-Z0-9._-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "    \033[36m%-22s\033[0m %s\n", $$1, $$2}'
	@echo ""


.PHONY: run
run: ## Stop then start containers  →  make run -- all  /  make run -- db analytics
ifeq ($(ARGS),)
	$(error No profiles given. Usage: make run -- <profile1> [profile2 ...])
endif
	$(eval PROFILE_FLAGS := $(call build_profiles,$(ARGS)))
	@echo "→ Stopping:  docker compose $(PROFILE_FLAGS) down"
	docker compose $(PROFILE_FLAGS) down
	@echo "→ Starting:  docker compose $(PROFILE_FLAGS) up -d"
	docker compose $(PROFILE_FLAGS) up -d
	@echo "→ Service URLs:"
	@CONTAINERS=$$(docker compose $(PROFILE_FLAGS) ps -q); \
	if [ -n "$$CONTAINERS" ]; then \
		docker inspect -f '{{.Name}} |{{range $$p, $$conf := .NetworkSettings.Ports}}{{if $$conf}}  http://localhost:{{(index $$conf 0).HostPort}}{{end}}{{end}}' $$CONTAINERS \
			| sed 's/^\///' \
			| awk -F'|' '{ printf " \033[1;34m\033[0m  \033[1;32m%-25s\033[0m%s\n", $$1, $$2 }'; \
	fi


.PHONY: stop
stop: ## Stop containers  →  make stop -- all  /  make stop -- db analytics
ifeq ($(ARGS),)
	$(error No profiles given. Usage: make stop -- <profile1> [profile2 ...])
endif
	$(eval PROFILE_FLAGS := $(call build_profiles,$(ARGS)))
	@echo "→ Stopping:  docker compose $(PROFILE_FLAGS) down"
	docker compose $(PROFILE_FLAGS) down

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