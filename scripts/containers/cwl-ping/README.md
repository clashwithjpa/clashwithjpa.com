# CWL Ping

Standalone container that pings — via a Discord webhook — every CWL applicant
who has been **assigned to a clan but hasn't joined it in-game yet**.

It runs one ping pass immediately, then repeats on a fixed interval for a fixed
number of passes, then exits. Meant to be kicked off once at the start of a CWL season
(e.g. `docker run` or a cron-triggered `docker compose run`).

## How it works

1. Reads CWL clans from `cwl_clan_info_table` and all assigned applications from
   `cwl_application_table`.
2. Pulls each clan's live member list from the Clash of Clans API.
3. Anyone whose `coc_account_tag` is **not** in their `assigned_to` clan gets
   their `discord_user_id` mentioned in a webhook embed, grouped per clan and
   chunked to stay under Discord's message-length limit.

Zero runtime dependencies — uses Bun's built-in SQL (Postgres) and `fetch`.

## Configuration

Copy `.env.example` to `.env` and fill it in.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `JPA_DATABASE_URL` | yes | — | Postgres connection string |
| `JPA_COC_API_TOKEN` | yes | — | Clash of Clans API token |
| `DISCORD_WEBHOOK_URL` | yes | — | Discord webhook to post pings to |
| `PUBLIC_COC_API_BASE_URI` | no | `https://cocproxy.royaleapi.dev` | CoC API base URL |
| `CWL_PING_COUNT` | no | `15` | Number of ping passes before exiting |
| `CWL_PING_INTERVAL_MINUTES` | no | `30` | Gap between ping passes |
| `CWL_PING_DRY_RUN` | no | `0` | `1` logs who'd be pinged, posts nothing |

## Run locally

```bash
bun run main.ts            # uses env from the shell / .env
bun run dry-run            # log targets without posting to Discord
```

## Run with Docker Compose (recommended)

This ships a standalone `docker-compose.yaml` that joins the project's shared
`clashwithjpa-network`, so the container can reach the database at `jpa-db:5432`
(set `JPA_DATABASE_URL` host accordingly in `.env`):

```bash
docker compose up --build
```

It's a one-shot job — it pings on the schedule, then exits. If you're running
this on its own before the rest of the stack, create the network first:

```bash
docker network create clashwithjpa-network
```

## Run with plain Docker

```bash
docker build -t cwl-ping .
docker run --rm --env-file .env --network clashwithjpa-network cwl-ping
```
