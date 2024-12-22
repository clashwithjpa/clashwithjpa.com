# Nuke the postgresql database

import os
import asyncio
import asyncpg
from dotenv import load_dotenv
from typing import List

tables: List[str] = [
    "base_table",
    "clan_table",
    "coc_table",
    "user_table",
]


async def main():
    load_dotenv()
    connection_string = os.getenv("DATABASE_URL")
    pool = await asyncpg.create_pool(connection_string)  # PostgreSQL connection

    print("Connected to PostgreSQL")

    # Truncate tables
    async with pool.acquire() as conn:
        for table in tables:
            await conn.execute(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE")
            print(f"Truncated table {table}")

        delete_table = input("Do you also want to delete the tables? (yes/no): ")
        if delete_table == "yes":
            for table in tables:
                await conn.execute(f"DROP TABLE {table}")
                print(f"Deleted table {table}")

    await pool.close()


asyncio.run(main())
