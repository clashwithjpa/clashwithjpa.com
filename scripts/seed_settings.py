import os
import asyncio
import asyncpg
from dotenv import load_dotenv
from typing import Optional
import json

async def read_markdown_file(file_path: str) -> Optional[str]:
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()
    except FileNotFoundError:
        print(f"File not found: {file_path}")
    except Exception as e:
        print(f"Error reading Markdown file: {e}")
    return None

async def store_markdown_content(pool: asyncpg.Pool, markdown_content: str):
    insert_query = """
    INSERT INTO settings_table (key, value)
    VALUES ('rules', $1)
    ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value;
    """
    json_content = json.dumps({'content': markdown_content})

    async with pool.acquire() as connection:
        try:
            await connection.execute(insert_query, json_content)
            print("Markdown content stored successfully.")
        except Exception as e:
            print(f"Error storing content in the database: {e}")
            raise

async def main():
    load_dotenv()
    connection_string = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/database")

    pool = await asyncpg.create_pool(connection_string)
    print("Connected to PostgreSQL.")

    try:
        markdown_file_path = 'rulebook.md'
        markdown_content = await read_markdown_file(markdown_file_path)

        if markdown_content:
            await store_markdown_content(pool, markdown_content)
        else:
            print("No content to store.")
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        await pool.close()
        print("Connection closed.")

if __name__ == "__main__":
    asyncio.run(main())
