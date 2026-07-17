"""
Gandhinagar Traffic Collector
Standalone APScheduler script — no HTTP service, no port.
Collects TomTom flow data for 30 Gandhinagar points and saves to disk.
"""

import json
import logging
import os
import sqlite3
import tempfile
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

import pytz
import requests
from apscheduler.schedulers.blocking import BlockingScheduler
from dotenv import load_dotenv

# ── Paths ──────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "gandhinagar.db"
LATEST_JSON_PATH = DATA_DIR / "latest_traffic_gandhinagar.json"
LOG_PATH = DATA_DIR / "collector.log"
POINTS_PATH = BASE_DIR / "monitoring_points.json"

# Also published here so the Vite dev server / static build can serve it directly.
PUBLIC_JSON_PATH = BASE_DIR.parent / "public" / "traffic" / "latest_traffic_gandhinagar.json"

DATA_DIR.mkdir(parents=True, exist_ok=True)
PUBLIC_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)

# ── Config from .env ────────────────────────────────────────────────────────
_env_path = BASE_DIR / ".env"
if not _env_path.exists():
    print(f"ERROR: .env file not found at {_env_path}")
    print("Create .env with TOMTOM_API_KEY=your_key_here and re-run.")
    raise SystemExit(1)

load_dotenv(_env_path)

API_KEY = os.getenv("TOMTOM_API_KEY", "").strip()
if not API_KEY or API_KEY == "your_key_here":
    print("ERROR: TOMTOM_API_KEY is not set in .env")
    print("Edit .env and replace 'your_key_here' with your actual TomTom API key.")
    raise SystemExit(1)

PEAK_INTERVAL_MIN = int(os.getenv("PEAK_INTERVAL_MIN", "15"))
OFFPEAK_INTERVAL_MIN = int(os.getenv("OFFPEAK_INTERVAL_MIN", "60"))
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

IST = pytz.timezone("Asia/Kolkata")
PEAK_START_HOUR = 6   # 6 AM IST
PEAK_END_HOUR = 21    # 9 PM IST

TOMTOM_URL = (
    "https://api.tomtom.com/traffic/services/4/"
    "flowSegmentData/absolute/10/json"
)
REQUEST_TIMEOUT = 20

# ── Logging ─────────────────────────────────────────────────────────────────
def _setup_logging() -> logging.Logger:
    fmt = "[%(asctime)s] %(levelname)s: %(message)s"
    datefmt = "%Y-%m-%d %H:%M:%S"
    level = getattr(logging, LOG_LEVEL, logging.INFO)

    logger = logging.getLogger("gandhinagar_collector")
    logger.setLevel(level)
    logger.propagate = False

    console = logging.StreamHandler()
    console.setFormatter(logging.Formatter(fmt, datefmt))
    console.setLevel(level)
    logger.addHandler(console)

    file_handler = logging.FileHandler(LOG_PATH, encoding="utf-8")
    file_handler.setFormatter(logging.Formatter(fmt, datefmt))
    file_handler.setLevel(level)
    logger.addHandler(file_handler)

    return logger

log = _setup_logging()

# ── Database ─────────────────────────────────────────────────────────────────
def _init_db() -> None:
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS traffic_flow (
                id                    INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp_utc         TEXT NOT NULL,
                timestamp_local       TEXT NOT NULL,
                name                  TEXT NOT NULL,
                lat                   REAL NOT NULL,
                lon                   REAL NOT NULL,
                current_speed         REAL,
                free_flow_speed       REAL,
                current_travel_time   REAL,
                free_flow_travel_time REAL,
                delay                 REAL,
                speed_ratio           REAL,
                confidence            REAL,
                frc                   TEXT,
                api_key_index         INTEGER DEFAULT 0,
                batch_id              TEXT NOT NULL
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_tf_batch  ON traffic_flow (batch_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_tf_ts_utc ON traffic_flow (timestamp_utc)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_tf_name   ON traffic_flow (name)")
        conn.commit()

# ── Monitoring points ────────────────────────────────────────────────────────
def _load_points() -> dict:
    with open(POINTS_PATH, encoding="utf-8") as f:
        return json.load(f)

# ── TomTom API ───────────────────────────────────────────────────────────────
def _fetch_point(name: str, lat: float, lon: float) -> dict | None:
    """Fetch one point from TomTom Flow API. Returns parsed fields or None."""
    try:
        resp = requests.get(
            TOMTOM_URL,
            params={"key": API_KEY, "point": f"{lat},{lon}"},
            timeout=REQUEST_TIMEOUT,
        )
    except requests.Timeout:
        log.warning("Timeout fetching %s — skipping", name)
        return None
    except requests.RequestException as exc:
        log.warning("Connection error fetching %s: %s", name, exc)
        return None

    if resp.status_code == 429:
        log.warning("Rate limited (HTTP 429) — skipping this cycle")
        return None
    if resp.status_code != 200:
        log.warning("HTTP %d fetching %s — skipping", resp.status_code, name)
        return None

    try:
        body = resp.json()
        fd = body["flowSegmentData"]
        current_speed = fd.get("currentSpeed")
        free_flow_speed = fd.get("freeFlowSpeed")
        current_tt = fd.get("currentTravelTime")
        free_flow_tt = fd.get("freeFlowTravelTime")
        confidence = fd.get("confidence")
        frc = fd.get("frc")

        delay = None
        speed_ratio = None
        if current_tt is not None and free_flow_tt is not None:
            delay = max(0.0, current_tt - free_flow_tt)
        if current_speed is not None and free_flow_speed and free_flow_speed > 0:
            speed_ratio = round(current_speed / free_flow_speed, 6)

        return {
            "current_speed": current_speed,
            "free_flow_speed": free_flow_speed,
            "current_travel_time": current_tt,
            "free_flow_travel_time": free_flow_tt,
            "delay": delay,
            "speed_ratio": speed_ratio,
            "confidence": confidence,
            "frc": frc,
        }
    except (KeyError, ValueError, TypeError) as exc:
        log.warning("Bad response parsing %s: %s", name, exc)
        return None

# ── Collection cycle ─────────────────────────────────────────────────────────
def run_collection() -> None:
    points = _load_points()
    batch_id = str(uuid.uuid4())
    now_utc = datetime.now(timezone.utc)
    now_ist = now_utc.astimezone(IST)

    ts_utc = now_utc.strftime("%Y-%m-%dT%H:%M:%SZ")
    ts_local = now_ist.strftime("%Y-%m-%dT%H:%M:%S+05:30")
    ts_local_display = now_ist.strftime("%Y-%m-%d %H:%M:%S IST")

    start = time.monotonic()
    rows = []
    json_points = []
    failed = 0

    for slug, cfg in points.items():
        name = cfg["name"]
        lat = cfg["lat"]
        lon = cfg["lon"]

        result = _fetch_point(name, lat, lon)
        if result is None:
            failed += 1
            continue

        rows.append((
            ts_utc, ts_local, name, lat, lon,
            result["current_speed"],
            result["free_flow_speed"],
            result["current_travel_time"],
            result["free_flow_travel_time"],
            result["delay"],
            result["speed_ratio"],
            result["confidence"],
            result["frc"],
            0,
            batch_id,
        ))

        # Build JSON point — field names match Gurugram's latest_traffic.json
        json_points.append({
            "name": name,
            "query_lat": lat,
            "query_lon": lon,
            "currentSpeed_kmph": result["current_speed"],
            "freeFlowSpeed_kmph": result["free_flow_speed"],
            "currentTravelTime_s": result["current_travel_time"],
            "freeFlowTravelTime_s": result["free_flow_travel_time"],
            "delay_s": result["delay"],
            "speed_ratio": result["speed_ratio"],
            "confidence": result["confidence"],
            "frc": result["frc"],
            "timestamp_utc": ts_utc,
            "timestamp_local": ts_local_display,
        })

    duration = round(time.monotonic() - start, 1)
    successful = len(rows)
    total = len(points)

    log.info(
        "Collected %d/%d points in %ss (batch %s)",
        successful, total, duration, batch_id[:8],
    )

    # Write DB — failure here does not block JSON write
    if rows:
        try:
            with sqlite3.connect(DB_PATH) as conn:
                conn.executemany(
                    """
                    INSERT INTO traffic_flow (
                        timestamp_utc, timestamp_local, name, lat, lon,
                        current_speed, free_flow_speed,
                        current_travel_time, free_flow_travel_time,
                        delay, speed_ratio, confidence, frc,
                        api_key_index, batch_id
                    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                    """,
                    rows,
                )
                conn.commit()
        except sqlite3.Error as exc:
            log.error("DB write failed: %s — JSON file will still be updated", exc)

    # Write JSON — only if at least one point succeeded
    if not json_points:
        log.error(
            "All %d points failed — leaving previous latest_traffic_gandhinagar.json intact",
            total,
        )
        return

    snapshot = {
        "generated_at_utc": ts_utc,
        "generated_at_local": ts_local_display,
        "city": "gandhinagar",
        "count": successful,
        "points": json_points,
        "collection_summary": {
            "total_points": total,
            "successful": successful,
            "failed": failed,
            "duration_seconds": duration,
        },
    }

    # Atomic write: write to temp file then rename so readers never see partial data
    for target_dir, target_path in ((DATA_DIR, LATEST_JSON_PATH), (PUBLIC_JSON_PATH.parent, PUBLIC_JSON_PATH)):
        try:
            tmp = tempfile.NamedTemporaryFile(
                mode="w", encoding="utf-8",
                dir=target_dir, suffix=".tmp", delete=False
            )
            json.dump(snapshot, tmp, indent=2)
            tmp.close()
            Path(tmp.name).replace(target_path)
        except OSError as exc:
            log.error("Failed to write %s: %s", target_path, exc)

# ── Scheduler ────────────────────────────────────────────────────────────────
def _current_interval_minutes() -> int:
    hour = datetime.now(IST).hour
    return PEAK_INTERVAL_MIN if PEAK_START_HOUR <= hour < PEAK_END_HOUR else OFFPEAK_INTERVAL_MIN

def _reschedule(scheduler: BlockingScheduler) -> None:
    """Replace the collection job with one using the correct current interval."""
    for job in scheduler.get_jobs():
        if job.id == "collect":
            job.remove()
    interval = _current_interval_minutes()
    scheduler.add_job(
        _tick,
        "interval",
        minutes=interval,
        id="collect",
        args=[scheduler],
        replace_existing=True,
    )
    log.info("Schedule updated: every %d minutes", interval)

def _tick(scheduler: BlockingScheduler) -> None:
    """Run one collection cycle then check if the interval needs to change."""
    run_collection()
    new_interval = _current_interval_minutes()
    current_job = scheduler.get_job("collect")
    if current_job and current_job.trigger.interval.total_seconds() / 60 != new_interval:
        _reschedule(scheduler)

def main() -> None:
    _init_db()

    points = _load_points()
    log.info("=" * 60)
    log.info("Gandhinagar Traffic Collector starting")
    log.info("Monitoring points: %d", len(points))
    log.info(
        "Schedule: %d min peak (06:00-21:00 IST), %d min off-peak",
        PEAK_INTERVAL_MIN, OFFPEAK_INTERVAL_MIN,
    )
    log.info("Database: %s", DB_PATH)
    log.info("Output:   %s", LATEST_JSON_PATH)
    log.info("=" * 60)

    # Run immediately on startup, then schedule
    run_collection()

    scheduler = BlockingScheduler(timezone=IST)
    interval = _current_interval_minutes()
    scheduler.add_job(
        _tick,
        "interval",
        minutes=interval,
        id="collect",
        args=[scheduler],
    )
    log.info("Scheduler started. Next run in %d minutes. Press Ctrl+C to stop.", interval)

    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        log.info("Collector stopped.")

if __name__ == "__main__":
    main()
