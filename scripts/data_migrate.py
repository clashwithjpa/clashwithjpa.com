# MongoDB to PostgreSQL migration script using Python
# pip install asyncpg python-dotenv motor requests

import os
import asyncio
import asyncpg
from dotenv import load_dotenv
import motor.motor_asyncio
from aiohttp import ClientSession, ClientConnectionError

DISCORD_BASE = "https://discord.com/api/v10"


async def check_guild_member_role(
    discord_id: str, session: ClientSession, headers: dict
):
    guild_id = "1029993902503108678"
    role_id = "1030004174148087878"

    try:
        resp = await session.get(
            f"{DISCORD_BASE}/guilds/{guild_id}/members/{discord_id}", headers=headers
        )
        # X-RateLimit-Limit - The number of requests that can be made
        # X-RateLimit-Remaining - The number of remaining requests that can be made
        # X-RateLimit-Reset - Epoch time (seconds since 00:00:00 UTC on January 1, 1970) at which the rate limit resets
        # X-RateLimit-Reset-After - Total time (in seconds) of when the current rate limit bucket will reset. Can have decimals to match previous millisecond ratelimit precision
        # X-RateLimit-Bucket - A unique string denoting the rate limit being encountered (non-inclusive of top-level resources in the path)
        # X-RateLimit-Global - Returned only on HTTP 429 responses if the rate limit encountered is the global rate limit (not per-route)
        # X-RateLimit-Scope - Returned only on HTTP 429 responses. Value can be user (per bot or user limit), global (per bot or user global limit), or shared (per resource limit)

        x_ratelimit_headers = {
            "x_ratelimit_limit": resp.headers.get("X-RateLimit-Limit", 0),
            "x_ratelimit_remaining": resp.headers.get("X-RateLimit-Remaining", 0),
            "x_ratelimit_reset": resp.headers.get("X-RateLimit-Reset", 0),
            "x_ratelimit_reset_after": resp.headers.get("X-RateLimit-Reset-After", 0),
            "x_ratelimit_bucket": resp.headers.get("X-RateLimit-Bucket", 0),
            "x_ratelimit_global": resp.headers.get("X-RateLimit-Global", 0),
            "x_ratelimit_scope": resp.headers.get("X-RateLimit-Scope", 0),
        }
        retry_after_header = resp.headers.get("Retry-After", 0)
        print(x_ratelimit_headers, retry_after_header)

        if resp.status != 200:
            return (False, x_ratelimit_headers, retry_after_header)

        member_data = await resp.json()
        return (
            str(role_id) in member_data.get("roles", []),
            x_ratelimit_headers,
            retry_after_header,
        )
    except ClientConnectionError:
        return False


async def check_user_exists(token, cocsData):
    headers = {"Authorization": "Bot " + token}
    result = {}
    cocsDataLength = len(cocsData)

    async with ClientSession() as session:
        for data in cocsData:
            discord_id = data["discordId"]
            (
                has_role,
                x_ratelimit_headers,
                retry_after_header,
            ) = await check_guild_member_role(discord_id, session, headers)
            print(
                f"Discord ID {discord_id}: In server with required role: {has_role} | {cocsData.index(data) + 1}/{cocsDataLength}"
            )
            result[discord_id] = has_role

            remaining_requests = int(x_ratelimit_headers["x_ratelimit_remaining"])
            if remaining_requests < 2:
                reset_time_after = float(x_ratelimit_headers["x_ratelimit_reset_after"])
                print(f"Sleeping for {reset_time_after} seconds")
                await asyncio.sleep(reset_time_after + 0.1)

    return result


async def bulk_bases_insert(pool, basesData):
    async with pool.acquire() as conn:
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


async def bulk_settings_insert(pool, settingsData):
    async with pool.acquire() as conn:
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


async def bulk_cocs_insert(pool, cocsData):
    discord_dat = await check_user_exists(os.getenv("DISCORD_BOT_TOKEN"), cocsData)

    userData = set()
    for coc in cocsData:
        userData.add((coc["discordId"], discord_dat[coc["discordId"]]))

    cocData = []
    for coc in cocsData:
        cocData.append((coc["discordId"], coc["cocTag"]))

    async with pool.acquire() as conn:
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

    # Connection acquire moved to the functions since long running functions were causing the connection to be released back to the pool
    await bulk_bases_insert(pool, basesData)
    await bulk_settings_insert(pool, settingsData)
    await bulk_cocs_insert(pool, cocsData)

    print("Data inserted into PostgreSQL")

    await pool.close()


# Run the asynchronous main function
asyncio.run(main())
