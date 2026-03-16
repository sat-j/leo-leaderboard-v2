from __future__ import annotations

import csv
from collections import Counter, defaultdict, deque
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parents[2]
PLAYERS_CSV = ROOT / "data" / "players.csv"
CORRECT_MATCHES_CSV = ROOT / "data" / "correct-matches-no-timestamp.csv"
TIMESTAMP_MATCHES_CSV = ROOT / "data" / "all-matches-with-timestamp.csv"
OUTPUT_CSV = ROOT / "data" / "scripts" / "comprehensive_matches.csv"
OUTPUT_SQL = ROOT / "data" / "scripts" / "insert_matches.sql"
OUTPUT_REPORT = ROOT / "data" / "scripts" / "match_import_report.txt"

WEEK_10_SATURDAY = date(2026, 3, 14)
DEFAULT_START_TIME = time(7, 0, 0)
DEFAULT_INCREMENT_MINUTES = 6


@dataclass(frozen=True)
class CorrectMatchRow:
    row_number: int
    week_number: int
    player1: str
    player2: str
    player3: str
    player4: str
    score1: int
    score2: int


@dataclass(frozen=True)
class TimestampMatchRow:
    timestamp: datetime
    player1: str
    player2: str
    player3: str
    player4: str
    score1: int
    score2: int


def sql_escape(value: str) -> str:
    return value.replace("'", "''")


def normalize_name(value: str) -> str:
    return " ".join((value or "").strip().split())


def parse_int(value: str) -> int:
    cleaned = (value or "").strip().rstrip(".")
    return int(cleaned)


def canonical_signature(player1: str, player2: str, player3: str, player4: str, score1: int, score2: int) -> str:
    team1 = tuple(sorted((normalize_name(player1), normalize_name(player2))))
    team2 = tuple(sorted((normalize_name(player3), normalize_name(player4))))
    return f"{team1}|{team2}|{score1}|{score2}"


def swapped_signature(player1: str, player2: str, player3: str, player4: str, score1: int, score2: int) -> str:
    team1 = tuple(sorted((normalize_name(player1), normalize_name(player2))))
    team2 = tuple(sorted((normalize_name(player3), normalize_name(player4))))
    return f"{team2}|{team1}|{score2}|{score1}"


def read_players() -> set[str]:
    with PLAYERS_CSV.open(encoding="utf-8-sig", newline="") as handle:
      reader = csv.DictReader(handle)
      return {normalize_name(row["PlayerName"]) for row in reader if row.get("PlayerName")}


def read_correct_matches() -> list[CorrectMatchRow]:
    rows: list[CorrectMatchRow] = []
    with CORRECT_MATCHES_CSV.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for idx, row in enumerate(reader, start=1):
            rows.append(
                CorrectMatchRow(
                    row_number=idx,
                    week_number=parse_int(row["WeekNumber"]),
                    player1=normalize_name(row["Player1"]),
                    player2=normalize_name(row["Player2"]),
                    player3=normalize_name(row["Player3"]),
                    player4=normalize_name(row["Player4"]),
                    score1=parse_int(row["Score1"]),
                    score2=parse_int(row["Score2."]),
                )
            )
    return rows


def read_timestamp_matches() -> list[TimestampMatchRow]:
    rows: list[TimestampMatchRow] = []
    with TIMESTAMP_MATCHES_CSV.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            rows.append(
                TimestampMatchRow(
                    timestamp=datetime.strptime(row["Timestamp"].strip(), "%d/%m/%Y %H:%M:%S"),
                    player1=normalize_name(row["Player1"]),
                    player2=normalize_name(row["Player2"]),
                    player3=normalize_name(row["Player3"]),
                    player4=normalize_name(row["Player4"]),
                    score1=parse_int(row["Score1"]),
                    score2=parse_int(row["Score2."]),
                )
            )
    return rows


def saturday_for_week(week_number: int) -> date:
    return WEEK_10_SATURDAY - timedelta(days=(10 - week_number) * 7)


def build_timestamp_index(rows: Iterable[TimestampMatchRow]) -> dict[str, deque[TimestampMatchRow]]:
    index: dict[str, deque[TimestampMatchRow]] = defaultdict(deque)
    for row in sorted(rows, key=lambda item: item.timestamp):
        index[canonical_signature(row.player1, row.player2, row.player3, row.player4, row.score1, row.score2)].append(row)
    return index


def try_assign_timestamp(
    row: CorrectMatchRow,
    timestamp_index: dict[str, deque[TimestampMatchRow]],
) -> tuple[datetime | None, str]:
    direct_key = canonical_signature(row.player1, row.player2, row.player3, row.player4, row.score1, row.score2)
    if timestamp_index[direct_key]:
        return timestamp_index[direct_key].popleft().timestamp, "exact"

    swapped_key = swapped_signature(row.player1, row.player2, row.player3, row.player4, row.score1, row.score2)
    if timestamp_index[swapped_key]:
        return timestamp_index[swapped_key].popleft().timestamp, "swapped"

    return None, "inferred"


def write_outputs() -> None:
    players = read_players()
    correct_matches = read_correct_matches()
    timestamp_matches = read_timestamp_matches()
    timestamp_index = build_timestamp_index(timestamp_matches)

    default_day_offsets: dict[int, int] = defaultdict(int)
    unresolved_players: Counter[str] = Counter()
    provenance_counter: Counter[str] = Counter()
    merged_rows: list[dict[str, str]] = []

    for row in correct_matches:
        assigned_timestamp, provenance = try_assign_timestamp(row, timestamp_index)
        provenance_counter[provenance] += 1

        if assigned_timestamp is None:
            saturday = saturday_for_week(row.week_number)
            assigned_timestamp = datetime.combine(
                saturday,
                (datetime.combine(saturday, DEFAULT_START_TIME) + timedelta(minutes=default_day_offsets[row.week_number] * DEFAULT_INCREMENT_MINUTES)).time(),
            )
            default_day_offsets[row.week_number] += 1

        for player_name in (row.player1, row.player2, row.player3, row.player4):
            if player_name not in players:
                unresolved_players[player_name] += 1

        merged_rows.append(
            {
                "import_key": f"w{row.week_number}-r{row.row_number}",
                "week_number": str(row.week_number),
                "play_date": assigned_timestamp.date().isoformat(),
                "played_at": assigned_timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                "timestamp_source": provenance,
                "player1": row.player1,
                "player2": row.player2,
                "player3": row.player3,
                "player4": row.player4,
                "score1": str(row.score1),
                "score2": str(row.score2),
            }
        )

    with OUTPUT_CSV.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "import_key",
                "week_number",
                "play_date",
                "played_at",
                "timestamp_source",
                "player1",
                "player2",
                "player3",
                "player4",
                "score1",
                "score2",
            ],
        )
        writer.writeheader()
        writer.writerows(merged_rows)

    values_sql = []
    participant_sql = []
    for row in merged_rows:
        values_sql.append(
            "    ("
            f"'{sql_escape(row['import_key'])}', "
            f"DATE '{row['play_date']}', "
            f"TIMESTAMP '{row['played_at']}', "
            f"{row['score1']}, "
            f"{row['score2']}, "
            f"'{sql_escape(row['timestamp_source'])}'"
            ")"
        )

        participant_sql.extend(
            [
                f"select '{sql_escape(row['import_key'])}', '{sql_escape(row['player1'])}', 1, 1",
                f"select '{sql_escape(row['import_key'])}', '{sql_escape(row['player2'])}', 1, 2",
                f"select '{sql_escape(row['import_key'])}', '{sql_escape(row['player3'])}', 2, 1",
                f"select '{sql_escape(row['import_key'])}', '{sql_escape(row['player4'])}', 2, 2",
            ]
        )

    sql_lines = [
        "-- Generated by data/scripts/build_match_import.py",
        "-- Source of truth: data/correct-matches-no-timestamp.csv",
        "-- Timestamp source preference: exact/swapped match from data/all-matches-with-timestamp.csv, otherwise inferred Saturday timestamp.",
        "",
        "begin;",
        "",
        "insert into public.play_dates (play_date, label_short, label_long, match_count, is_processed)",
        "select distinct",
        "  import_rows.play_date,",
        "  to_char(import_rows.play_date, 'Dy Mon DD'),",
        "  to_char(import_rows.play_date, 'FMDay, FMMonth DD, YYYY'),",
        "  0,",
        "  false",
        "from (",
        "  values",
        ",\n".join(f"    (DATE '{row['play_date']}')" for row in merged_rows),
        ") as import_rows(play_date)",
        "on conflict (play_date) do nothing;",
        "",
        "with import_rows(import_key, play_date, played_at, score1, score2, timestamp_source) as (",
        "  values",
        ",\n".join(values_sql),
        "), inserted_matches as (",
        "  insert into public.matches (play_date_id, played_at, score1, score2, submitted_via, source, status, validation_notes)",
        "  select",
        "    pd.id,",
        "    import_rows.played_at,",
        "    import_rows.score1,",
        "    import_rows.score2,",
        "    'historical-import',",
        "    'historical-import',",
        "    'validated',",
        "    jsonb_build_object('import_key', import_rows.import_key, 'timestamp_source', import_rows.timestamp_source)",
        "  from import_rows",
        "  join public.play_dates pd on pd.play_date = import_rows.play_date",
        "  returning id, validation_notes->>'import_key' as import_key",
        "), participant_rows(import_key, player_name, team_number, seat_number) as (",
        "  " + "\n  union all\n  ".join(participant_sql),
        ")",
        "insert into public.match_participants (match_id, player_id, team_number, seat_number)",
        "select",
        "  inserted_matches.id,",
        "  players.id,",
        "  participant_rows.team_number,",
        "  participant_rows.seat_number",
        "from participant_rows",
        "join inserted_matches on inserted_matches.import_key = participant_rows.import_key",
        "join public.players on players.display_name = participant_rows.player_name;",
        "",
        "update public.play_dates pd",
        "set match_count = counts.match_count",
        "from (",
        "  select play_date_id, count(*) as match_count",
        "  from public.matches",
        "  group by play_date_id",
        ") counts",
        "where pd.id = counts.play_date_id;",
        "",
        "commit;",
        "",
    ]
    OUTPUT_SQL.write_text("\n".join(sql_lines), encoding="utf-8")

    unmatched_timestamp_rows = sum(len(queue) for queue in timestamp_index.values())
    report_lines = [
        f"Canonical matches: {len(correct_matches)}",
        f"Timestamp rows available: {len(timestamp_matches)}",
        f"Assigned exact timestamps: {provenance_counter['exact']}",
        f"Assigned swapped-team timestamps: {provenance_counter['swapped']}",
        f"Inferred Saturday timestamps: {provenance_counter['inferred']}",
        f"Unused timestamp rows remaining: {unmatched_timestamp_rows}",
        "",
        "Week to Saturday mapping:",
    ]

    for week in range(1, 11):
        saturday = saturday_for_week(week)
        sunday = saturday + timedelta(days=1)
        report_lines.append(f"  w{week}: {saturday.isoformat()} (Sat), {sunday.isoformat()} (Sun)")

    report_lines.append("")
    report_lines.append("Unmatched player names against data/players.csv:")
    if unresolved_players:
        for player_name, count in unresolved_players.most_common():
            report_lines.append(f"  {player_name}: {count}")
    else:
        report_lines.append("  None")

    OUTPUT_REPORT.write_text("\n".join(report_lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    write_outputs()
