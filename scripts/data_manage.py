import os
import asyncio
import asyncpg
from dotenv import load_dotenv
from typing import List
import json

tables: List[str] = [
    "base_table",
    "clan_table",
    "coc_table",
    "user_table",
    "cwl_table",
]

other_tables: List[str] = [
    "clan_application_table",
    "settings_table",
]

async def backup_settings(pool: asyncpg.Pool, output_file: str = "settings_backup.json"):
    async with pool.acquire() as conn:
        settings = await conn.fetch("SELECT key, value FROM settings_table")
        backup_data = [{"key": record["key"], "value": record["value"]} for record in settings]

        with open(output_file, "w") as f:
            json.dump(backup_data, f, indent=2)
        print(f"Backed up {len(backup_data)} settings to {output_file}")

async def restore_settings(pool: asyncpg.Pool, input_file: str = "settings_backup.json"):
    async with pool.acquire() as conn:
        try:
            with open(input_file, "r") as f:
                settings_backup = json.load(f)

            for setting in settings_backup:
                if "key" not in setting or "value" not in setting:
                    raise ValueError(f"Invalid setting format: {setting}")

            async with conn.transaction():
                await conn.execute("TRUNCATE settings_table")

                for setting in settings_backup:
                    try:
                        await conn.execute(
                            """
                            INSERT INTO settings_table (key, value)
                            VALUES ($1, $2)
                            ON CONFLICT (key) DO UPDATE
                            SET value = EXCLUDED.value
                            """,
                            setting["key"],
                            setting["value"]
                        )
                    except Exception as e:
                        print(f"Error restoring setting {setting['key']}: {e}")
                        raise

            print("Settings restored successfully")

        except json.JSONDecodeError:
            print("Error: Invalid JSON in backup file")
        except Exception as e:
            print(f"Error restoring settings: {e}")


async def main():
    load_dotenv()
    connection_string = os.getenv("DATABASE_URL")
    pool = await asyncpg.create_pool(connection_string)

    print("Connected to PostgreSQL")

    apply_backup = input("Do you want to apply the backup of settings_table? (yes/no): ")
    if apply_backup == "yes":
        await restore_settings(pool, "settings_backup.json")

    want_backup = input("Do you want to backup the settings_table? (yes/no): ")
    if want_backup == "yes":
        await backup_settings(pool)

    truncate_table = input("Do you want to truncate the tables? (yes/no): ")
    if truncate_table == "yes":
        async with pool.acquire() as conn:
            for table in tables:
                await conn.execute(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE")
                print(f"Truncated table {table}")

            delete_table = input("Do you also want to delete the tables? (yes/no): ")
            if delete_table == "yes":
                for table in tables:
                    await conn.execute(f"DROP TABLE {table}")
                    print(f"Deleted table {table}")

    do_other_tables = input("Do you want to truncate other tables? (yes/no): ")
    if do_other_tables == "yes":
        async with pool.acquire() as conn:
            for table in other_tables:
                await conn.execute(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE")
                print(f"Truncated table {table}")

            delete_table = input("Do you also want to delete the tables? (yes/no): ")
            if delete_table == "yes":
                for table in other_tables:
                    await conn.execute(f"DROP TABLE {table}")
                    print(f"Deleted table {table}")

    await pool.close()


asyncio.run(main())
