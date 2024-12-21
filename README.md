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

1. Follow steps 1 & 2 from the [installation guide](#-installation). _Ignore if already done._

2. Build the app
    ```sh
    pnpm build
    ```

3. Preview the app
    ```sh
    pnpm preview
    ```

## ✏️ Editing Data

Now that you have the app running, you can edit the data in the [`data`](./data/) directory. You can add, edit, or delete any file in the [`data`](./data/) directory. The app will automatically update the data.
- [`info.json`](./data/info.json): Contains authorizations informations.
    <details>

    <summary>Info keys</summary>

    - `guildID` (`integer`): The Guild ID of the Discord server where the user must be present.
        - This is used to verify the user's presence in the Discord server.
        - If the user is not present in the server, the user doesn't get access to the panel.
    - `adminRoleID` (`list of integers`): The Role ID of the Admin role in the Discord server.
        - This role will have access to the admin panel.

    </details>
- [`clans.json`](./data/clans.json): Contains the list of clans tags and requirements.
- [`clans/<clan-tag>.md`](./data/clans/): Contains the requirements for the clan with the specified tag.
- [`clans/components`](./data/clans/components/): Contains information which are common for all clans.
- [`clans/components/order.json`](./data/clans/components/order.json): Contains the order of common components to be displayed in the clan page.

- How to add a new clan?
    - Add the clan tag in the [`clans.json`](./data/clans.json) file.
    - Create a new file in the [`clans`](./data/clans/) directory with the name `<clan-tag>.md`.
    - Add the requirements in the newly created file.

- How to edit clan requirements?
    - Open the [`clans.json`](./data/clans.json) file and find the clan tag.
    - Add/Remove requirements in the respective of label names in [`static/labels`](./static/labels/) directory.
    - Do the necessary changes in `<clan-tag>.md` file.
> [!IMPORTANT]
> The label name declared in the [`clans.json`](./data/clans.json) file should match the file name in the [`static/labels`](./static/labels/) directory.

## Working with database and drizzle

To make any changes to the database, you have to follow certain steps to avoid issues

- Edit the database schema file with required changes
- Run `pnpm run db:generate` to generate the migrations file
- Run `pnpm run db:migrate` to apply the changes to the database

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
