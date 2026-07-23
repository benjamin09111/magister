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
        await db.execute("""
            CREATE TABLE IF NOT EXISTS topologies (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                N INTEGER NOT NULL,
                lambda_val REAL NOT NULL,
                sensors_count INTEGER NOT NULL,
                gateway INTEGER NOT NULL,
                gateway_mode TEXT NOT NULL,
                nodes TEXT NOT NULL,
                edges TEXT NOT NULL
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS datasets (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                sweep_param TEXT NOT NULL,
                replicas INTEGER NOT NULL,
                base_seed INTEGER NOT NULL,
                centrality_metric TEXT NOT NULL,
                topology_generator TEXT NOT NULL,
                methods TEXT NOT NULL,
                base_config TEXT NOT NULL,
                sweep_values TEXT NOT NULL,
                results TEXT NOT NULL,
                raw_replicas TEXT NOT NULL
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

async def add_saved_topology(item: Dict[str, Any]):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """
            INSERT INTO topologies (
                id, name, timestamp, N, lambda_val, sensors_count, 
                gateway, gateway_mode, nodes, edges
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                item["id"],
                item["name"],
                item["timestamp"],
                item["N"],
                item["lambda_val"],
                item["sensors_count"],
                item["gateway"],
                item["gateway_mode"],
                json.dumps(item["nodes"]),
                json.dumps(item["edges"])
            )
        )
        await db.commit()

async def get_all_saved_topologies() -> List[Dict[str, Any]]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM topologies ORDER BY timestamp DESC") as cursor:
            rows = await cursor.fetchall()
            
            topologies = []
            for row in rows:
                topologies.append({
                    "id": row["id"],
                    "name": row["name"],
                    "timestamp": row["timestamp"],
                    "N": row["N"],
                    "lambda_val": row["lambda_val"],
                    "sensors_count": row["sensors_count"],
                    "gateway": row["gateway"],
                    "gateway_mode": row["gateway_mode"],
                    "nodes": json.loads(row["nodes"]),
                    "edges": json.loads(row["edges"])
                })
            return topologies

async def delete_saved_topology(topo_id: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("DELETE FROM topologies WHERE id = ?", (topo_id,))
        await db.commit()

async def add_dataset(item: Dict[str, Any]):
    """
    Persists a batch-sweep dataset (parameter values + averaged per-point
    results + compact per-replica raw results), so summary plots can be
    regenerated later WITHOUT re-running the Monte Carlo simulation.
    """
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """
            INSERT INTO datasets (
                id, name, timestamp, sweep_param, replicas, base_seed,
                centrality_metric, topology_generator, methods, base_config,
                sweep_values, results, raw_replicas
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                item["id"],
                item["name"],
                item["timestamp"],
                item["sweep_param"],
                item["replicas"],
                item["base_seed"],
                item["centrality_metric"],
                item["topology_generator"],
                json.dumps(item["methods"]),
                json.dumps(item["base_config"]),
                json.dumps(item["values"]),
                json.dumps(item["results"]),
                json.dumps(item["raw_replicas"])
            )
        )
        await db.commit()

def _row_to_dataset_summary(row) -> Dict[str, Any]:
    methods = json.loads(row["methods"])
    values = json.loads(row["sweep_values"])
    return {
        "id": row["id"],
        "name": row["name"],
        "timestamp": row["timestamp"],
        "sweep_param": row["sweep_param"],
        "replicas": row["replicas"],
        "base_seed": row["base_seed"],
        "centrality_metric": row["centrality_metric"],
        "topology_generator": row["topology_generator"],
        "methods": methods,
        "num_points": len(values)
    }

async def get_all_datasets() -> List[Dict[str, Any]]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM datasets ORDER BY timestamp DESC") as cursor:
            rows = await cursor.fetchall()
            return [_row_to_dataset_summary(row) for row in rows]

async def get_dataset(dataset_id: str) -> Optional[Dict[str, Any]]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM datasets WHERE id = ?", (dataset_id,)) as cursor:
            row = await cursor.fetchone()
            if not row:
                return None
            return {
                "id": row["id"],
                "name": row["name"],
                "timestamp": row["timestamp"],
                "sweep_param": row["sweep_param"],
                "replicas": row["replicas"],
                "base_seed": row["base_seed"],
                "centrality_metric": row["centrality_metric"],
                "topology_generator": row["topology_generator"],
                "methods": json.loads(row["methods"]),
                "base_config": json.loads(row["base_config"]),
                "values": json.loads(row["sweep_values"]),
                "results": json.loads(row["results"]),
                "raw_replicas": json.loads(row["raw_replicas"])
            }

async def delete_dataset(dataset_id: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("DELETE FROM datasets WHERE id = ?", (dataset_id,))
        await db.commit()
