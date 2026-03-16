from __future__ import annotations

import csv
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
CSV_PATH = ROOT / "data" / "players.csv"
OUTPUT_PATH = ROOT / "data" / "scripts" / "insert_players.sql"


def normalize_level(level: str) -> str:
    normalized = level.strip().upper()
    if normalized == "BEG":
        return "INT"
    if normalized in {"PLUS", "INT", "ADV"}:
        return normalized
    return "INT"


def slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.strip().lower()).strip("-")
    return slug or "player"


def sql_escape(value: str) -> str:
    return value.replace("'", "''")


def main() -> None:
    rows = []
    used_slugs: dict[str, int] = {}

    with CSV_PATH.open(newline="", encoding="utf-8-sig") as csv_file:
        reader = csv.DictReader(csv_file)
        for row in reader:
            name = (row.get("PlayerName") or "").strip()
            if not name:
                continue

            base_slug = slugify(name)
            slug_index = used_slugs.get(base_slug, 0)
            used_slugs[base_slug] = slug_index + 1
            slug = base_slug if slug_index == 0 else f"{base_slug}-{slug_index + 1}"

            rows.append(
                {
                    "display_name": name,
                    "slug": slug,
                    "level": normalize_level(row.get("Level") or ""),
                    "initial_mu": row.get("InitialMu", "").strip() or "20",
                    "initial_sigma": row.get("InitialSigma", "").strip() or "8.33",
                }
            )

    lines = [
        "-- Generated from data/players.csv by data/scripts/generate_insert_players_sql.py",
        "-- Legacy BEG values are normalized to INT.",
        "",
        "insert into public.players (",
        "  display_name,",
        "  slug,",
        "  level,",
        "  initial_mu,",
        "  initial_sigma,",
        "  is_active",
        ")",
        "values",
    ]

    value_lines = []
    for row in rows:
        value_lines.append(
            "  ("
            f"'{sql_escape(row['display_name'])}', "
            f"'{sql_escape(row['slug'])}', "
            f"'{row['level']}', "
            f"{row['initial_mu']}, "
            f"{row['initial_sigma']}, "
            "true"
            ")"
        )

    lines.append(",\n".join(value_lines))
    lines.extend(
        [
            "on conflict (slug) do update",
            "set",
            "  display_name = excluded.display_name,",
            "  level = excluded.level,",
            "  initial_mu = excluded.initial_mu,",
            "  initial_sigma = excluded.initial_sigma,",
            "  is_active = excluded.is_active,",
            "  updated_at = now();",
            "",
        ]
    )

    OUTPUT_PATH.write_text("\n".join(lines), encoding="ascii")


if __name__ == "__main__":
    main()
