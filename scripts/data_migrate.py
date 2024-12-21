# MongoDB to PostgreSQL migration script using Python
# pip install asyncpg python-dotenv motor

import os
import asyncio
import asyncpg
from dotenv import load_dotenv
import motor.motor_asyncio


async def bulk_bases_insert(conn, basesData):
    async with conn.transaction():
        for base in basesData:
            await conn.execute(
                """
                INSERT INTO base_table (code, base_link, image_link)
                VALUES ($1, $2, $3)
            """,
                base["code"],
                base["baseLink"],
                base["imageLink"],
            )


async def bulk_settings_insert(conn, settingsData):
    async with conn.transaction():
        for setting in settingsData:
            await conn.execute(
                """
                INSERT INTO clan_table (clan_code, clan_tag, clan_role_id, member_role_id, elder_role_id, coleader_role_id, leader_role_id, leader_id, channel_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            """,
                setting["clanCode"],
                setting["clanTag"],
                setting["clanRoleId"],
                setting["memberRoleId"],
                setting["elderRoleId"],
                setting["coleaderRoleId"],
                setting["leaderRoleId"],
                setting["leaderId"],
                setting["channel"],
            )

async def bulk_cocs_insert(conn, cocsData):
    userData = set()
    for coc in cocsData:
        userData.add((coc["discordId"], True))

    cocData = []
    for coc in cocsData:
        cocData.append((coc["discordId"], coc["cocTag"]))

    async with conn.transaction():
        await conn.executemany(
            """
            INSERT INTO user_table (discord_id, is_active)
            VALUES ($1, $2)
            """,
            userData
        )

        await conn.executemany(
            """
            INSERT INTO coc_table (user_id, tag)
            VALUES ($1, $2)
            """,
            cocData
        )

async def main():
    load_dotenv()

    connection_string = os.getenv("DATABASE_URL")
    pool = await asyncpg.create_pool(connection_string)  # PostgreSQL connection
    print("Connected to PostgreSQL")

    mongo_client = motor.motor_asyncio.AsyncIOMotorClient(
        os.getenv("MONGO_URL")
    )  # MongoDB connection
    print("Connected to MongoDB")

    mongo_db = mongo_client["test"]  # MongoDB database

    # MongoDB collections
    mongo_cocs = mongo_db["cocs"]
    mongo_settings = mongo_db["clansettings"]
    mongo_bases = mongo_db["bases"]

    cocsData = []
    settingsData = []
    basesData = []

    async for doc in mongo_bases.find():
        basesData.append(doc)

    async for doc in mongo_settings.find():
        settingsData.append(doc)

    async for doc in mongo_cocs.find():
        cocsData.append(doc)

    print("Data fetched from MongoDB")

    async with pool.acquire() as conn:
        time = await conn.fetchval("SELECT NOW();")
        version = await conn.fetchval("SELECT version();")

        await bulk_bases_insert(conn, basesData)
        await bulk_settings_insert(conn, settingsData)
        await bulk_cocs_insert(conn, cocsData)

        print("Data inserted into PostgreSQL")

    await pool.close()

    print("Current time:", time)
    print("PostgreSQL version:", version)


# Run the asynchronous main function
asyncio.run(main())
