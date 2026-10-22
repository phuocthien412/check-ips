import sqlite3
import json
import logging
from typing import List, Tuple, Optional

logger = logging.getLogger("agent.buffer")

class LocalBuffer:
    """
    SQLite-backed resilient queue.
    If Central Server is temporarily unreachable, payloads are persisted locally
    and flushed automatically once the connection recovers.
    """
    def __init__(self, db_path: str = "agent_buffer.db", max_records: int = 1000):
        self.db_path = db_path
        self.max_records = max_records
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS telemetry_queue (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    payload TEXT NOT NULL
                )
            """)
            conn.commit()

    def enqueue(self, payload_dict: dict):
        """Save payload to local database when server is unreachable"""
        try:
            payload_json = json.dumps(payload_dict)
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("INSERT INTO telemetry_queue (payload) VALUES (?)", (payload_json,))
                # Prune old records if exceeding max_records
                conn.execute("""
                    DELETE FROM telemetry_queue 
                    WHERE id NOT IN (SELECT id FROM telemetry_queue ORDER BY id DESC LIMIT ?)
                """, (self.max_records,))
                conn.commit()
            logger.info("Buffered 1 telemetry packet locally.")
        except Exception as e:
            logger.error(f"Failed to buffer payload: {e}")

    def peek_batch(self, limit: int = 10) -> List[Tuple[int, dict]]:
        """Retrieve the oldest cached payloads"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT id, payload FROM telemetry_queue ORDER BY id ASC LIMIT ?", (limit,))
                rows = cursor.fetchall()
                return [(row[0], json.loads(row[1])) for row in rows]
        except Exception as e:
            logger.error(f"Failed to read from buffer: {e}")
            return []

    def remove_ids(self, ids: List[int]):
        """Remove successfully synchronized payload IDs"""
        if not ids:
            return
        try:
            with sqlite3.connect(self.db_path) as conn:
                placeholders = ",".join("?" for _ in ids)
                conn.execute(f"DELETE FROM telemetry_queue WHERE id IN ({placeholders})", ids)
                conn.commit()
            logger.info(f"Purged {len(ids)} flushed packets from local buffer.")
        except Exception as e:
            logger.error(f"Failed to delete buffer IDs: {e}")
