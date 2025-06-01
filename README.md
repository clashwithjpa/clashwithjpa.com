<div align="center">

![JPA](./assets/jpa.png)

Clash With JPA

</div>

## 🚀 Installation

1. Clone this repository
    ```sh
    git clone https://github.com/clashwithjpa/clashwithjpa.com clashwithjpa
    cd clashwithjpa
    ```

2. Install dependencies
    ```sh
    pnpm i
    ```

3. Start the app
    ```sh
    pnpm dev
    ```

## 🌐 Production

1. Follow steps 1 & 2 from the [installation guide](#-installation). *Ignore if already done.*

2. Build the app
    ```sh
    pnpm build
    ```

3. Preview the app
    ```sh
    pnpm preview
    ```

## 📂 Working with database and drizzle

To make any changes to the database, you have to follow certain steps to avoid issues

- Edit the database schema file with required changes
- Run `pnpm run db:push` to apply the changes to the database

This will ensure that the changes are applied to the database without any issues.

You can also try `pnpm run db:studio` to open a web interface to interact with the database.

## ⌨️ Contributing

- Things to keep in mind
    - Follow our commit message convention.
    - Write meaningful commit messages.
    - Keep the code clean and readable.
    - Make sure the app is working as expected.

- Code Formatting
    - Run `pnpm format` before committing your changes or use [`Prettier`](https://prettier.io/) extension in your code editor.
    - Make sure to fix all the linting errors. Run `pnpm lint` to check for linting errors.
