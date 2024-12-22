# MongoDB to PostgreSQL migration script using Python
# pip install asyncpg python-dotenv motor requests

import os
import asyncio
import asyncpg
from dotenv import load_dotenv
import motor.motor_asyncio
from aiohttp import ClientSession, ClientConnectionError

DISCORD_BASE = "https://discord.com/api/v10"

# check_user_exists -> check_guild_member_role -> make_request -> fetch_api

async def fetch_api(url: str, session: ClientSession, **kwargs):
    try:
        resp = await session.request(method="GET", url=url, **kwargs)
    except ClientConnectionError:
        return (url, 400)
    return (url, resp.status)


async def make_request(urls: set, **kwargs):
    async with ClientSession() as session:
        tasks = []
        for url in urls:
            tasks.append(fetch_api(url, session, **kwargs))
        results = await asyncio.gather(*tasks)

    for result in results:
        print(f"{result[1]} - {str(result[0])}")


async def check_guild_member_role(discord_id: str, session: ClientSession, headers: dict):
    guild_id = "1029993902503108678"
    role_id = "1030004174148087878"
    
    try:
        resp = await session.get(f"{DISCORD_BASE}/guilds/{guild_id}/members/{discord_id}", headers=headers)
        if resp.status != 200:
            return False
            
        member_data = await resp.json()
        return str(role_id) in member_data.get("roles", [])
    except ClientConnectionError:
        return False

async def check_user_exists(token, cocsData):
    headers = {"Authorization": "Bot " + token}
    result = {}

    async with ClientSession() as session:
        for data in cocsData:
            discord_id = data["discordId"]
            has_role = await check_guild_member_role(discord_id, session, headers)
            print(f"Discord ID {discord_id}: In server with required role: {has_role}")
            result[discord_id] = has_role

    return result

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
    discord_dat = await check_user_exists(os.getenv("DISCORD_BOT_TOKEN"), cocsData)

    userData = set()
    for coc in cocsData:
        userData.add((coc["discordId"], discord_dat[coc["discordId"]]))

    cocData = []
    for coc in cocsData:
        cocData.append((coc["discordId"], coc["cocTag"]))


    async with conn.transaction():
        await conn.executemany(
            """
            INSERT INTO user_table (discord_id, is_active)
            VALUES ($1, $2)
            """,
            userData,
        )

        await conn.executemany(
            """
            INSERT INTO coc_table (user_id, tag)
            VALUES ($1, $2)
            """,
            cocData,
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
