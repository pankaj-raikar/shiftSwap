import sqlite3
import json
import os
from datetime import datetime
from typing import List, Optional, Tuple
from pathlib import Path

from .models import Staff, Shift, Listing, ActionHistoryItem

def get_db_path() -> str:
    return os.environ.get("DATABASE_PATH", str(Path(__file__).parent.parent / "shiftswap.db"))

def get_seed_path() -> str:
    env_path = os.environ.get("SEED_PATH")
    if env_path and os.path.exists(env_path):
        return env_path
    
    local_backend_seed = Path(__file__).parent.parent / "seed.json"
    if local_backend_seed.exists():
        return str(local_backend_seed)
        
    root_seed = Path(__file__).parent.parent.parent / "seed.json"
    return str(root_seed)

def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db(force_reset: bool = False):
    """Initializes tables and loads seed.json if DB has no prior saved state (or if force_reset is True)."""
    conn = get_connection()
    cursor = conn.cursor()

    if force_reset:
        cursor.execute("DROP TABLE IF EXISTS action_history;")
        cursor.execute("DROP TABLE IF EXISTS listings;")
        cursor.execute("DROP TABLE IF EXISTS shifts;")
        cursor.execute("DROP TABLE IF EXISTS staff;")

    # Create tables
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS staff (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        certifications TEXT NOT NULL
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS shifts (
        id TEXT PRIMARY KEY,
        start TEXT NOT NULL,
        end TEXT NOT NULL,
        required_certification TEXT,
        assigned_to TEXT NOT NULL,
        FOREIGN KEY (assigned_to) REFERENCES staff(id)
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS listings (
        id TEXT PRIMARY KEY,
        shift_id TEXT NOT NULL,
        status TEXT NOT NULL,
        poster_id TEXT NOT NULL,
        claimed_by TEXT,
        FOREIGN KEY (shift_id) REFERENCES shifts(id),
        FOREIGN KEY (poster_id) REFERENCES staff(id),
        FOREIGN KEY (claimed_by) REFERENCES staff(id)
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS action_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        actor_id TEXT NOT NULL,
        actor_name TEXT NOT NULL,
        action_type TEXT NOT NULL,
        shift_id TEXT NOT NULL,
        listing_id TEXT,
        outcome TEXT NOT NULL,
        details TEXT NOT NULL
    );
    """)
    conn.commit()

    # Check if DB has prior saved state
    cursor.execute("SELECT COUNT(*) as count FROM staff;")
    row = cursor.fetchone()
    has_state = row["count"] > 0

    seed_path = get_seed_path()
    if not has_state and os.path.exists(seed_path):
        load_seed_data(conn, seed_path)

    conn.close()

def load_seed_data(conn: sqlite3.Connection, seed_file: str):
    """Loads seed.json into the database."""
    with open(seed_file, "r") as f:
        data = json.load(f)

    cursor = conn.cursor()
    # Insert staff
    for s in data.get("staff", []):
        cursor.execute(
            "INSERT INTO staff (id, name, role, certifications) VALUES (?, ?, ?, ?)",
            (s["id"], s["name"], s["role"], json.dumps(s.get("certifications", [])))
        )

    # Insert shifts
    for sh in data.get("shifts", []):
        cursor.execute(
            "INSERT INTO shifts (id, start, end, required_certification, assigned_to) VALUES (?, ?, ?, ?, ?)",
            (sh["id"], sh["start"], sh["end"], sh.get("required_certification"), sh["assigned_to"])
        )

    # Insert listings if present in seed
    for l in data.get("listings", []):
        cursor.execute(
            "INSERT INTO listings (id, shift_id, status, poster_id, claimed_by) VALUES (?, ?, ?, ?, ?)",
            (l["id"], l["shift_id"], l["status"], l["poster_id"], l.get("claimed_by"))
        )

    # Add initial seed log entry in action_history
    now_iso = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    cursor.execute(
        "INSERT INTO action_history (timestamp, actor_id, actor_name, action_type, shift_id, listing_id, outcome, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (now_iso, "system", "System Initialization", "SEED", "all", None, "SUCCESS", "Loaded initial roster from seed.json")
    )

    conn.commit()

# DB Helper Functions

def get_all_staff() -> List[Staff]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, role, certifications FROM staff ORDER BY name ASC")
    rows = cursor.fetchall()
    conn.close()
    return [
        Staff(
            id=r["id"],
            name=r["name"],
            role=r["role"],
            certifications=json.loads(r["certifications"])
        )
        for r in rows
    ]

def get_staff_by_id(staff_id: str) -> Optional[Staff]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, role, certifications FROM staff WHERE id = ?", (staff_id,))
    r = cursor.fetchone()
    conn.close()
    if not r:
        return None
    return Staff(
        id=r["id"],
        name=r["name"],
        role=r["role"],
        certifications=json.loads(r["certifications"])
    )

def get_all_shifts() -> List[Shift]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, start, end, required_certification, assigned_to FROM shifts ORDER BY start ASC")
    rows = cursor.fetchall()
    conn.close()
    return [
        Shift(
            id=r["id"],
            start=r["start"],
            end=r["end"],
            required_certification=r["required_certification"],
            assigned_to=r["assigned_to"]
        )
        for r in rows
    ]

def get_shift_by_id(shift_id: str) -> Optional[Shift]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, start, end, required_certification, assigned_to FROM shifts WHERE id = ?", (shift_id,))
    r = cursor.fetchone()
    conn.close()
    if not r:
        return None
    return Shift(
        id=r["id"],
        start=r["start"],
        end=r["end"],
        required_certification=r["required_certification"],
        assigned_to=r["assigned_to"]
    )

def get_shifts_assigned_to(staff_id: str) -> List[Shift]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, start, end, required_certification, assigned_to FROM shifts WHERE assigned_to = ? ORDER BY start ASC", (staff_id,))
    rows = cursor.fetchall()
    conn.close()
    return [
        Shift(
            id=r["id"],
            start=r["start"],
            end=r["end"],
            required_certification=r["required_certification"],
            assigned_to=r["assigned_to"]
        )
        for r in rows
    ]

def get_all_listings() -> List[Listing]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, shift_id, status, poster_id, claimed_by FROM listings")
    rows = cursor.fetchall()
    conn.close()
    return [
        Listing(
            id=r["id"],
            shift_id=r["shift_id"],
            status=r["status"],
            poster_id=r["poster_id"],
            claimed_by=r["claimed_by"]
        )
        for r in rows
    ]

def get_active_listing_for_shift(shift_id: str) -> Optional[Listing]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, shift_id, status, poster_id, claimed_by FROM listings WHERE shift_id = ? AND status IN ('OPEN', 'CLAIMED')", (shift_id,))
    r = cursor.fetchone()
    conn.close()
    if not r:
        return None
    return Listing(
        id=r["id"],
        shift_id=r["shift_id"],
        status=r["status"],
        poster_id=r["poster_id"],
        claimed_by=r["claimed_by"]
    )

def get_listing_by_id(listing_id: str) -> Optional[Listing]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, shift_id, status, poster_id, claimed_by FROM listings WHERE id = ?", (listing_id,))
    r = cursor.fetchone()
    conn.close()
    if not r:
        return None
    return Listing(
        id=r["id"],
        shift_id=r["shift_id"],
        status=r["status"],
        poster_id=r["poster_id"],
        claimed_by=r["claimed_by"]
    )

def create_listing_record(listing: Listing):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO listings (id, shift_id, status, poster_id, claimed_by) VALUES (?, ?, ?, ?, ?)",
        (listing.id, listing.shift_id, listing.status, listing.poster_id, listing.claimed_by)
    )
    conn.commit()
    conn.close()

def update_listing_status(listing_id: str, status: str, claimed_by: Optional[str] = None):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE listings SET status = ?, claimed_by = ? WHERE id = ?",
        (status, claimed_by, listing_id)
    )
    conn.commit()
    conn.close()

def update_shift_assigned_to(shift_id: str, new_assignee_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE shifts SET assigned_to = ? WHERE id = ?",
        (new_assignee_id, shift_id)
    )
    conn.commit()
    conn.close()

def log_action(actor_id: str, actor_name: str, action_type: str, shift_id: str, listing_id: Optional[str], outcome: str, details: str):
    conn = get_connection()
    cursor = conn.cursor()
    now_iso = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    cursor.execute(
        "INSERT INTO action_history (timestamp, actor_id, actor_name, action_type, shift_id, listing_id, outcome, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (now_iso, actor_id, actor_name, action_type, shift_id, listing_id, outcome, details)
    )
    conn.commit()
    conn.close()

def get_action_history() -> List[ActionHistoryItem]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, timestamp, actor_id, actor_name, action_type, shift_id, listing_id, outcome, details FROM action_history ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    return [
        ActionHistoryItem(
            id=r["id"],
            timestamp=r["timestamp"],
            actor_id=r["actor_id"],
            actor_name=r["actor_name"],
            action_type=r["action_type"],
            shift_id=r["shift_id"],
            listing_id=r["listing_id"],
            outcome=r["outcome"],
            details=r["details"]
        )
        for r in rows
    ]
