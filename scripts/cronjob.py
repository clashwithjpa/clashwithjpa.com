import os
import asyncio
import signal
import json
from aiohttp import ClientSession, ClientError, ClientTimeout
import asyncpg
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from dotenv import load_dotenv
from typing import Dict, Any, List, Optional
from enum import Enum

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class GracefulExit(SystemExit):
    pass


class EndpointType(Enum):
    CLAN_INFO = ("clans/{tag}", "clan_data")
    CLAN_MEMBERS = ("clans/{tag}/members", "clan_members")
    CLAN_CURRENT_WAR = ("clans/{tag}/currentwar", "clan_current_war")

    def __init__(self, endpoint: str, db_column: str):
        self.endpoint = endpoint
        self.db_column = db_column


class ClashOfClans:
    def __init__(self, database_url: str, public_api_base_uri: str, api_token: str):
        self.database_url = database_url
        self.pool: Optional[asyncpg.Pool] = None
        self.public_api_base_uri = public_api_base_uri
        self.api_token = api_token
        self.headers = {"Authorization": f"Bearer {api_token}"}
        self.session: Optional[ClientSession] = None
        self._shutdown = False

    async def connect(self):
        try:
            self.pool = await asyncpg.create_pool(
                self.database_url,
                min_size=5,
                max_size=20,
                command_timeout=60,
                timeout=10,
            )
            self.session = ClientSession(timeout=ClientTimeout(total=30))
        except asyncpg.PostgresError as e:
            logger.error(f"Database connection failed: {e}")
            raise
        except Exception as e:
            logger.error(f"Connection setup failed: {e}")
            raise

    async def close(self):
        try:
            if self.pool:
                await self.pool.close()
            if self.session and not self.session.closed:
                await self.session.close()
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")

    async def _make_api_request(
        self, endpoint_type: EndpointType, clan_tag: str
    ) -> Dict[str, Any]:
        """Generic method to make API requests with retry logic"""
        if self._shutdown:
            raise GracefulExit("Shutdown in progress")

        formatted_tag = clan_tag.replace("#", "%23")
        url = f"{self.public_api_base_uri}/v1/{endpoint_type.endpoint.format(tag=formatted_tag)}"

        try:
            async with self.session.get(url, headers=self.headers) as resp:
                if resp.status == 429:
                    retry_after = int(resp.headers.get("Retry-After", 60))
                    logger.warning(f"Rate limited. Waiting {retry_after} seconds")
                    await asyncio.sleep(retry_after)
                    return await self._make_api_request(endpoint_type, clan_tag)

                if resp.status != 200:
                    error_text = await resp.text()
                    raise ClientError(
                        f"API request failed with status {resp.status}: {error_text}"
                    )

                return await resp.json()

        except asyncio.TimeoutError:
            logger.error(f"Timeout while fetching {endpoint_type.name} for {clan_tag}")
            raise
        except ClientError as e:
            logger.error(f"HTTP error for {endpoint_type.name} {clan_tag}: {e}")
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error fetching {endpoint_type.name} {clan_tag}: {e}"
            )
            raise

    async def _update_clan_data(
        self, clan_tag: str, data: Dict[str, Any], endpoint_type: EndpointType
    ):
        """Generic method to update clan data in database"""
        if self._shutdown:
            raise GracefulExit("Shutdown in progress")

        try:
            async with self.pool.acquire() as con:
                async with con.transaction():
                    await con.execute(
                        f"""
                        UPDATE clan_table
                        SET {endpoint_type.db_column} = $1::jsonb
                        WHERE clan_tag = $2
                        """,
                        json.dumps(data),
                        clan_tag,
                    )
                logger.info(f"Updated {endpoint_type.name} for {clan_tag}")
        except asyncpg.PostgresError as e:
            logger.error(
                f"Database error updating {endpoint_type.name} for {clan_tag}: {e}"
            )
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error updating {endpoint_type.name} for {clan_tag}: {e}"
            )
            raise

    async def fetch_clan_tags(self) -> List[Dict[str, str]]:
        if self._shutdown:
            raise GracefulExit("Shutdown in progress")

        try:
            async with self.pool.acquire() as con:
                return await con.fetch("SELECT clan_tag FROM clan_table")
        except asyncpg.PostgresError as e:
            logger.error(f"Database error fetching clan tags: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error fetching clan tags: {e}")
            raise

    async def _update_all_clan_data(self, endpoint_type: EndpointType):
        """Generic method to update all clans for a specific endpoint type"""
        if self._shutdown:
            raise GracefulExit("Shutdown in progress")

        try:
            clan_tags = await self.fetch_clan_tags()
            failed_clans = []

            for clan_tag in clan_tags:
                if self._shutdown:
                    break

                clan_tag = clan_tag["clan_tag"]
                try:
                    data = await self._make_api_request(endpoint_type, clan_tag)
                    await self._update_clan_data(clan_tag, data, endpoint_type)
                except Exception as e:
                    logger.error(
                        f"Failed processing {endpoint_type.name} for {clan_tag}: {e}"
                    )
                    failed_clans.append(clan_tag)
                    continue

            if failed_clans:
                logger.warning(
                    f"Failed to update {endpoint_type.name} for the following clans: {', '.join(failed_clans)}"
                )

        except GracefulExit:
            logger.info(
                f"Graceful shutdown initiated during {endpoint_type.name} updates"
            )
            raise
        except Exception as e:
            logger.error(f"Failed updating {endpoint_type.name}: {e}")
            raise

    # Public methods that use the generic implementations
    async def update_all_clans_info(self):
        await self._update_all_clan_data(EndpointType.CLAN_INFO)

    async def update_all_clan_members(self):
        await self._update_all_clan_data(EndpointType.CLAN_MEMBERS)

    async def update_all_clan_current_wars(self):
        await self._update_all_clan_data(EndpointType.CLAN_CURRENT_WAR)

    def initiate_shutdown(self):
        logger.info("Initiating graceful shutdown")
        self._shutdown = True


async def setup_signal_handlers(coc: ClashOfClans):
    def signal_handler():
        logger.info("Received shutdown signal")
        coc.initiate_shutdown()

    for sig in (signal.SIGTERM, signal.SIGINT):
        asyncio.get_running_loop().add_signal_handler(sig, signal_handler)


async def main():
    load_dotenv()
    DATABASE_URL = os.getenv("DATABASE_URL")
    PUBLIC_API_BASE_URI = os.getenv("PUBLIC_API_BASE_URI")
    API_TOKEN = os.getenv("API_TOKEN")

    if not all([DATABASE_URL, PUBLIC_API_BASE_URI, API_TOKEN]):
        raise ValueError("Missing required environment variables")

    coc = None
    try:
        coc = ClashOfClans(DATABASE_URL, PUBLIC_API_BASE_URI, API_TOKEN)
        await coc.connect()
        await setup_signal_handlers(coc)

        scheduler = AsyncIOScheduler()

        jobs = [
            (coc.update_all_clans_info, "0"),  # Runs at midnight
            (coc.update_all_clan_members, "0"),  # Runs at midnight
            (coc.update_all_clan_current_wars, "*/1"),  # Runs every hour
        ]

        for job_func, hour in jobs:
            scheduler.add_job(
                job_func,
                CronTrigger(hour=hour),
                max_instances=1,
                coalesce=True,
                misfire_grace_time=None,
            )

        scheduler.start()

        for job_func, _ in jobs:
            await job_func()
            await asyncio.sleep(5)

        while not coc._shutdown:
            await asyncio.sleep(1)

    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt")
    except GracefulExit:
        logger.info("Graceful shutdown completed")
    except Exception as e:
        logger.error(f"Critical error in main: {e}")
        raise
    finally:
        if coc:
            await coc.close()
        if "scheduler" in locals():
            scheduler.shutdown()
        logger.info("Cleanup completed")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Script terminated by user")
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        exit(1)
