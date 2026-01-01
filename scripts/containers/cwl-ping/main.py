import os
import asyncio
from aiohttp import ClientSession, ClientTimeout
import asyncpg
import logging
from dotenv import load_dotenv
from typing import Dict, Any, List, Optional

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class ClashOfClansAPI:
    def __init__(self, coc_api_key: str, session: ClientSession):
        self.session = session
        self.COC_API_BASE_URL = "https://cocproxy.royaleapi.dev"
        self.coc_api_key = coc_api_key
        self.headers = {
            "Authorization": f"Bearer {self.coc_api_key}",
            "Accept": "application/json",
        }

    async def fetch(self, url: str, retries: int = 3) -> Dict[str, Any]:
        for attempt in range(retries):
            try:
                async with self.session.get(url, headers=self.headers) as response:
                    if response.status == 200:
                        return await response.json()
                    logger.warning(
                        f"Attempt {attempt + 1}/{retries} failed for {url}: {response.status}"
                    )
            except Exception as e:
                logger.warning(f"Attempt {attempt + 1}/{retries} error for {url}: {e}")

            if attempt < retries - 1:
                await asyncio.sleep(1 * (attempt + 1))

        logger.error(f"All {retries} attempts failed for {url}")
        return {}

    async def get_clan_members(self, clan_tag: str) -> List[Dict[str, Any]]:
        clan_tag_encoded = clan_tag.replace("#", "%23")
        url = f"{self.COC_API_BASE_URL}/v1/clans/{clan_tag_encoded}/members"
        data = await self.fetch(url)
        return data.get("items", [])


class DatabaseManager:
    def __init__(self, db_url: str):
        self.db_url = db_url
        self.pool: Optional[asyncpg.Pool] = None

    async def connect(self):
        try:
            self.pool = await asyncpg.create_pool(self.db_url)
            logger.info("Database connection pool created successfully.")
        except Exception as e:
            logger.error(f"Failed to connect to the database: {e}")
            raise

    async def close(self):
        if self.pool:
            await self.pool.close()
            logger.info("Database connection pool closed.")

    async def fetch_cwl_clans(self) -> List[Dict[str, Any]]:
        if not self.pool:
            return []
        async with self.pool.acquire() as connection:
            rows = await connection.fetch("SELECT * FROM cwl_clan_table")
            return [dict(row) for row in rows]

    async def fetch_cwl_applications(self) -> List[Dict[str, Any]]:
        if not self.pool:
            return []
        async with self.pool.acquire() as connection:
            rows = await connection.fetch("SELECT * FROM cwl_table")
            return [dict(row) for row in rows]


class DiscordNotifier:
    def __init__(self, webhook_url: str, session: ClientSession):
        self.webhook_url = webhook_url
        self.session = session

    async def send_notification(
        self, user_ids: List[str], clan_name: str = None, clan_tag: str = None
    ):
        mentions = [f"<@{user_id}>" for user_id in user_ids]

        clan_link = None
        if clan_tag:
            encoded_tag = clan_tag.replace("#", "%23")
            clan_link = f"https://link.clashofclans.com/en?action=OpenClanProfile&tag={encoded_tag}"

        if clan_link and clan_name:
            description = f"**Chief! Your clan needs you for Clan War League!**\n\nRally to your assigned clan immediately.\n\n🎮 **[Tap here to join {clan_name}]({clan_link})**"
        elif clan_name:
            description = f"**Chief! Your clan needs you for Clan War League!**\n\nSearch for **{clan_name}** in-game and request to join."
        else:
            description = "**Chief! Your clan needs you for Clan War League!**"

        embed = {
            "title": "⚔️ Clan War League Summons",
            "description": description,
            "color": 0xF1C40F,  # Gold color
            "fields": [],
            "footer": {
                "text": "⏰ War starts soon — don't keep your clanmates waiting!"
            },
        }

        if clan_name:
            embed["fields"].append(
                {"name": "🏰 Clan", "value": clan_name, "inline": True}
            )
        if clan_tag:
            embed["fields"].append(
                {"name": "🏷️ Tag", "value": f"`{clan_tag}`", "inline": True}
            )
        if len(user_ids) > 0:
            embed["fields"].append(
                {"name": "⚔️ Chiefs Needed", "value": str(len(user_ids)), "inline": True}
            )

        max_content_length = 1900
        mention_chunks: List[str] = []
        current_chunk = ""

        for mention in mentions:
            if len(current_chunk) + len(mention) + 1 > max_content_length:
                mention_chunks.append(current_chunk.strip())
                current_chunk = mention
            else:
                current_chunk += f" {mention}"

        if current_chunk.strip():
            mention_chunks.append(current_chunk.strip())

        first_payload = {"username": "Chief Pinger", "embeds": [embed]}
        if mention_chunks:
            first_payload["content"] = mention_chunks[0]

        async with self.session.post(self.webhook_url, json=first_payload) as response:
            if 200 <= response.status < 300:
                logger.info("Notification sent successfully.")
            else:
                logger.error(
                    f"Failed to send notification: {response.status} {await response.text()}"
                )
                return

        for chunk in mention_chunks[1:]:
            payload = {"username": "Chief Pinger", "content": chunk}
            async with self.session.post(self.webhook_url, json=payload) as response:
                if 200 <= response.status < 300:
                    logger.info("Follow-up notification sent successfully.")
                else:
                    logger.error(
                        f"Failed to send follow-up: {response.status} {await response.text()}"
                    )
            await asyncio.sleep(0.3)


async def main():
    load_dotenv()
    COC_API_KEY = os.getenv("API_TOKEN")
    DB_URL = os.getenv("DATABASE_URL")
    DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL")

    if not all([COC_API_KEY, DB_URL, DISCORD_WEBHOOK_URL]):
        logger.error("Missing environment variables. Please check your .env file.")
        return

    db_manager = DatabaseManager(DB_URL)

    try:
        await db_manager.connect()

        async with ClientSession(timeout=ClientTimeout(total=20)) as session:
            clash_api = ClashOfClansAPI(COC_API_KEY, session)
            discord_notifier = DiscordNotifier(DISCORD_WEBHOOK_URL, session)

            cwl_clans = await db_manager.fetch_cwl_clans()
            cwl_applications = await db_manager.fetch_cwl_applications()

            if not cwl_clans:
                logger.warning("No CWL clans found in the database. Exiting.")
                return
            if not cwl_applications:
                logger.info(
                    "No CWL applications found in the database. Nothing to check."
                )
                return

            clan_lookup = {clan["tag"]: clan for clan in cwl_clans}

            clan_members_map: Dict[str, set] = {}
            for clan in cwl_clans:
                members = await clash_api.get_clan_members(clan["tag"])
                clan_members_map[clan["tag"]] = {m["tag"] for m in members}
                logger.info(
                    f"Clan {clan['tag']} ({clan.get('clan_name', 'N/A')}) has {len(members)} members."
                )
                await asyncio.sleep(0.1)

            pending_by_clan: Dict[str, List[str]] = {}
            for app in cwl_applications:
                assigned_clan = app.get("assigned_to")
                if not assigned_clan:
                    continue

                clan_members = clan_members_map.get(assigned_clan, set())
                if app["account_tag"] not in clan_members:
                    if assigned_clan not in pending_by_clan:
                        pending_by_clan[assigned_clan] = []
                    pending_by_clan[assigned_clan].append(app["user_id"])

            if pending_by_clan:
                for clan_tag, user_ids in pending_by_clan.items():
                    unique_user_ids = list(set(user_ids))
                    clan_info = clan_lookup.get(clan_tag, {})
                    clan_name = clan_info.get("clan_name", clan_tag)

                    logger.info(
                        f"Notifying {len(unique_user_ids)} users for clan {clan_name} ({clan_tag})"
                    )
                    await discord_notifier.send_notification(
                        unique_user_ids, clan_name, clan_tag
                    )
                    await asyncio.sleep(0.5)
            else:
                logger.info("All applicants have joined their assigned CWL clans.")

    except Exception as e:
        logger.critical(
            f"A critical error occurred in the main process: {e}", exc_info=True
        )
    finally:
        await db_manager.close()


async def run_scheduled_checks():
    total_runs = 12
    wait_interval_seconds = 1 * 60 * 60

    for i in range(total_runs):
        run_number = i + 1
        logger.info(f"--- Starting run {run_number}/{total_runs} ---")

        await main()

        logger.info(f"--- Finished run {run_number}/{total_runs} ---")

        if run_number < total_runs:
            logger.info("Waiting for 1 hour before the next run...")
            await asyncio.sleep(wait_interval_seconds)

    logger.info("All scheduled runs are complete. Exiting script.")


if __name__ == "__main__":
    asyncio.run(run_scheduled_checks())
