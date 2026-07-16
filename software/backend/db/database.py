import os
import sqlite3
import json
import aiosqlite
from typing import List, Dict, Any, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "history.db")

async def init_db():
    """
    Initializes the database and creates tables if they don't exist.
    """
    # Ensure folder exists
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS history (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                method TEXT NOT NULL,
                N INTEGER NOT NULL,
                lambda_val REAL NOT NULL,
                sensors_count INTEGER NOT NULL,
                channels INTEGER NOT NULL,
                total_overlaps INTEGER NOT NULL,
                is_schedulable INTEGER NOT NULL,
                average_hops REAL NOT NULL,
                parameters TEXT NOT NULL,
                results TEXT NOT NULL
            )
        """)
        await db.commit()

async def add_history_item(item: Dict[str, Any]):
    """
    Adds a new simulation run to the history.
    """
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """
            INSERT INTO history (
                id, timestamp, method, N, lambda_val, sensors_count, 
                channels, total_overlaps, is_schedulable, average_hops, 
                parameters, results
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                item["id"],
                item["timestamp"],
                item["method"],
                item["N"],
                item["lambda_val"],
                item["sensors_count"],
                item["channels"],
                item["total_overlaps"],
                1 if item["is_schedulable"] else 0,
                item["average_hops"],
                json.dumps(item["parameters"]),
                json.dumps(item["results"])
            )
        )
        await db.commit()

async def get_all_history() -> List[Dict[str, Any]]:
    """
    Retrieves all history items sorted by timestamp descending.
    """
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM history ORDER BY timestamp DESC") as cursor:
            rows = await cursor.fetchall()
            
            history = []
            for row in rows:
                history.append({
                    "id": row["id"],
                    "timestamp": row["timestamp"],
                    "method": row["method"],
                    "N": row["N"],
                    "lambda_val": row["lambda_val"],
                    "sensors_count": row["sensors_count"],
                    "channels": row["channels"],
                    "total_overlaps": row["total_overlaps"],
                    "is_schedulable": bool(row["is_schedulable"]),
                    "average_hops": row["average_hops"],
                    "parameters": json.loads(row["parameters"]),
                    "results": json.loads(row["results"])
                })
            return history

async def get_history_item(item_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieves a single history item.
    """
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM history WHERE id = ?", (item_id,)) as cursor:
            row = await cursor.fetchone()
            if row:
                return {
                    "id": row["id"],
                    "timestamp": row["timestamp"],
                    "method": row["method"],
                    "N": row["N"],
                    "lambda_val": row["lambda_val"],
                    "sensors_count": row["sensors_count"],
                    "channels": row["channels"],
                    "total_overlaps": row["total_overlaps"],
                    "is_schedulable": bool(row["is_schedulable"]),
                    "average_hops": row["average_hops"],
                    "parameters": json.loads(row["parameters"]),
                    "results": json.loads(row["results"])
                }
            return None

async def delete_history_item(item_id: str):
    """
    Deletes a history item by ID.
    """
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("DELETE FROM history WHERE id = ?", (item_id,))
        await db.commit()

async def delete_all_history():
    """
    Clears all history logs.
    """
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("DELETE FROM history")
        await db.commit()
