#  Contributing

Thank you for considering contributing to our project! We welcome contributions from the community and are excited to have you on board. Below are some guidelines to help you get started. Join our Discord server if you have any questions or need assistance.

## Running the project

To run the project locally, follow these steps:

### Setup Dependencies

1. Install Bun (https://bun.com/docs/installation)
2. Install project dependencies:
   ```bash
   bun install
   ```

### Setup Development Environment

1. Start the required docker services & analytics:
    ```bash
    make run -- all
    ```

2. Setup the environment variables by copying the example file and filling in the required values. There are few .env files for different parts of the project, so make sure to copy all of them:
    ```bash
    cp apps/server/.env.example apps/server/.env
    cp apps/server/.env.server-db.example apps/server/.env.server-db
    cp apps/web/.env.example apps/web/.env
    ```

3. Whenever you reset db (e.g. `make db-reset`, which removes the docker volume for the database), run the following commands to setup the database schema:
    ```bash
    make migrate
    ```

    Optionally, you can seed the database for some tables with:
    ```bash
    bun --filter server dataset:migrate
    ```

    You need certain `.csv` files in `apps/server/prisma/dataset/` to run the seeding, which are not included in the repo. Join the Discord and ask for access if you need them.

### Start the development servers
1. Start the development servers for both the web app and the server:
    ```bash
    turbo run dev
    ```

This will start the web app on `http://localhost:5173` and the server on `http://localhost:3000`.

### Additional Info

- If you change the database schema (files in `apps/server/src/lib/db/schema`, other than ba-auth.ts), you need to run `make generate` to generate the migration files, and then run `make migrate` to apply the changes to the database.
- If you make any changes to auth file, which also affects the database schema of auth, you need to run `bun --filter server ba:generate`, which automatically generates the schema for auth. Then you need to generate migration files with `make generate` and apply the migration with `make migrate`.
- If you want to run only the web app or the server, you can run the following commands:
    ```bash
    bun --filter web dev
    bun --filter server dev
    ```

    This applies for other commands they are configured with too.
