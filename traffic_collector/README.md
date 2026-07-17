# Gandhinagar Traffic Collector

Collects live TomTom traffic data for 30 Gandhinagar hotspots every 15 minutes (peak)
or 60 minutes (off-peak). Standalone script — no server, no port, no dependencies on
the Gurugram collector.

## Setup

```bash
pip install -r requirements.txt
```

Edit `.env` and replace `your_key_here` with your TomTom API key:

```
TOMTOM_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Start

```bash
python collect.py
```

Runs immediately on startup, then repeats on schedule. Press Ctrl+C to stop.

## Schedule

| Period     | Hours (IST)   | Interval  |
|------------|---------------|-----------|
| Peak       | 06:00 – 21:00 | 15 min    |
| Off-peak   | 21:00 – 06:00 | 60 min    |

## Output files

| File | Description |
|------|-------------|
| `data/gandhinagar.db` | Full historical data (SQLite) |
| `data/latest_traffic_gandhinagar.json` | Latest snapshot (read by main app) |
| `data/collector.log` | Per-cycle collection log |

## Copy snapshot to main app

After each collection cycle, copy the snapshot to the main app's dynamic data folder:

```bash
cp data/latest_traffic_gandhinagar.json \
   ../../mobility_test/data/dynamic/latest_traffic_gandhinagar.json
```

Or set up a cron job / rsync to do this automatically after each run.

The main app reads this file when Gandhinagar live data is requested.
If the file is absent the app will show no traffic data for Gandhinagar (no crash).

## Monitoring points

30 points across 5 zones:

- **Zone 1 — Entry/Exit** (8 points): Koba Circle, Sargasan Circle, Infocity Circle, Pethapur Entry, NH-147 Chandkheda, Vaishnodevi Circle, Chiloda Road Entry, Manipur Circle
- **Zone 2 — Main Corridors** (8 points): CH Road Sectors 5/11/21, GH Road Sectors 7/16, Junctions at Sectors 11/21/30
- **Zone 3 — Key Destinations** (7 points): Secretariat, GIFT City, Railway Station, Mahatma Mandir, Akshardham Road, Infocity IT Park, Bhat Circle
- **Zone 4 — Sabarmati River Corridor** (4 points): Riverfront North, Sector 9 River Road, Basan Bridge, Indroda Park Road
- **Zone 5 — Surrounding Areas** (3 points): Kudasan Circle, Raysan Junction, Adalaj Circle

## Data collection started

[Update this date when deployed to server]
