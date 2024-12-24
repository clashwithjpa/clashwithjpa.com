# MongoDB to PostgreSQL migration script using Python
# pip install asyncpg python-dotenv motor requests

import os
import asyncio
import asyncpg
from dotenv import load_dotenv
import motor.motor_asyncio
from aiohttp import ClientSession

DISCORD_BASE = "https://discord.com/api/v10"

clan_names = {
    "av": "AvengerS.",
    "jc": "JOHN CENA",
    "pb": "Playyboys♥️",
    "1e": "#1 Elite",
    "hb": "Hell Boys",
    "eg": "ELITE GAMERZ",
    "uc": "űśă ćőļmbîă",
    "sg": "sports game",
}

clan_requirements = {
    "#9JUVCV0L": {"attacks": 70, "donations": 5000, "clangames": 1000},
    "#PQP2Y2QV": {"attacks": 60, "donations": 5000, "clangames": 1000},
    "#PCCJUVJQ": {"attacks": 60, "donations": 5000, "clangames": 1000},
    "#GGUR2Y2": {"attacks": 60, "donations": 5000, "clangames": 1000},
    "#RCPLRRJ8": {"attacks": 70, "donations": 6000, "clangames": 1000},
    "#P9RLJR2J": {"attacks": 50, "donations": 3500, "clangames": 1000},
    "#29VJYRLY8": {"attacks": 20, "donations": 1000, "clangames": 1000},
    "#GL0RRUC0": {"attacks": 50, "donations": 3500, "clangames": 1000},
}


async def fetch_all_guild_members(session: ClientSession, headers: dict):
    """
    List Guild Members
    GET/guilds/{guild.id}/members

    Returns a list of guild member objects that are members of the guild.

    Guild Member Object
    Guild Member Structure
    Field	Type	Description
    user?	user object	the user this guild member represents
    nick?	?string	this user's guild nickname
    avatar?	?string	the member's guild avatar hash
    banner?	?string	the member's guild banner hash
    roles	array of snowflakes	array of role object ids
    joined_at	ISO8601 timestamp	when the user joined the guild
    premium_since?	?ISO8601 timestamp	when the user started boosting the guild
    deaf	boolean	whether the user is deafened in voice channels
    mute	boolean	whether the user is muted in voice channels
    flags	integer	guild member flags represented as a bit set, defaults to 0
    pending?	boolean	whether the user has not yet passed the guild's Membership Screening requirements
    permissions?	string	total permissions of the member in the channel, including overwrites, returned when in the interaction object
    communication_disabled_until?	?ISO8601 timestamp	when the user's timeout will expire and the user will be able to communicate in the guild again, null or a time in the past if the user is not timed out
    avatar_decoration_data?	?avatar decoration data object	data for the member's guild avatar decoration

    Example Guild Member

    Copy
    {
    "user": {},
    "nick": "NOT API SUPPORT",
    "avatar": null,
    "banner": null,
    "roles": [],
    "joined_at": "2015-04-26T06:26:56.936000+00:00",
    "deaf": false,
    "mute": false
    }
    """

    members = []
    limit = 1000
    next_page_params = {"limit": limit}
    guild_id = "1029993902503108678"

    while True:
        url = f"{DISCORD_BASE}/guilds/{guild_id}/members"
        resp = await session.get(url, params=next_page_params, headers=headers)

        if resp.status != 200:
            raise Exception(f"Failed to fetch members: {await resp.text()}")

        batch = await resp.json()
        if not batch:
            break

        members.extend(batch)
        next_page_params = {"limit": limit, "after": batch[-1]["user"]["id"]}

    return members


async def check_user_exists(token):
    headers = {"Authorization": "Bot " + token}
    result = {}
    role_id = "1030004174148087878"

    async with ClientSession() as session:
        members = await fetch_all_guild_members(session, headers)
        for member in members:
            if role_id in member["roles"]:
                result[member["user"]["id"]] = True

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
                    INSERT INTO clan_table (clan_code, clan_tag, clan_role_id, member_role_id, elder_role_id, coleader_role_id, leader_role_id, leader_id, channel_id, clan_name, attacks_requirement, donations_requirement, clangames_requirement)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
                    clan_names[setting["clanCode"]],
                    clan_requirements[setting["clanTag"]]["attacks"],
                    clan_requirements[setting["clanTag"]]["donations"],
                    clan_requirements[setting["clanTag"]]["clangames"],
                )


async def bulk_cocs_insert(pool, cocsData):
    discord_dat = await check_user_exists(os.getenv("DISCORD_BOT_TOKEN"))
    print(f"Total users in discord: {len(discord_dat)}")

    userData = set()
    for coc in cocsData:
        userData.add((coc["discordId"], discord_dat.get(coc["discordId"], False)))

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
