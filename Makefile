# project related
PROJECT_NAME:=voyager
CONTAINER_NAME:=voyager:v0.2.0

ENV_FILE:=.env

APP_PORT:=8000
DATABASE_BIND_PATH:=./lancedb
REGION:=ap-southeast-2
MODEL_ID:=anthropic.claude-3-sonnet-20240229-v1:0

# build and run this service only
.PHONY: build
build:
	@docker build -t $(CONTAINER_NAME) .

.PHONY: run
run: build
	@docker run --rm -p $(APP_PORT):$(APP_PORT) --name $(PROJECT_NAME) $(CONTAINER_NAME)

.PHONY: env
env:
	@echo "APP_PORT=$(APP_PORT)"> $(ENV_FILE)
	@echo "DATABASE_BIND_PATH=$(DATABASE_BIND_PATH)">> $(ENV_FILE)
	@echo "REGION=$(REGION)">> $(ENV_FILE)
	@echo "MODEL_ID=$(MODEL_ID)">> $(ENV_FILE)

#  normal build & up
.PHONY: compose-build
compose-build: env
	@docker compose -f docker-compose.yaml build

.PHONY: up
up: compose-build
	@docker compose -f docker-compose.yaml up -d

#  dev build & up
.PHONY: compose-build-dev
compose-build-dev: env
	@docker compose -f docker-compose-dev.yaml build

.PHONY: dev
dev: compose-build-dev
	@docker compose -f docker-compose-dev.yaml up -d

# stop
.PHONY: stop
stop:
	docker compose stop