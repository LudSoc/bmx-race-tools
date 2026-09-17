#!/bin/sh
# Propager les données canoniques (sqorz_stats + club_stats) vers les dépôts frères.
# Usage : tools/sync-data.sh   (depuis la racine club_stats)
#  - clubs.json (canonique ici) -> sqorz_stats, h2h_stats, category_stats, ranking_stats
#  - perf-rankings.json (canonique sqorz_stats) -> ranking_stats
# Puis commiter dans chaque dépôt (1 commit par dépôt, sans push sauf demande).
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="$(dirname "$ROOT")"
cp "$ROOT/clubs.json" "$BASE/sqorz_stats/clubs.json" 2>/dev/null && echo "OK  sqorz_stats/clubs.json" || echo "SKIP sqorz_stats"
for d in h2h_stats category_stats ranking_stats; do
  if [ -d "$BASE/$d" ]; then
    cp "$ROOT/clubs.json" "$BASE/$d/clubs.json"
    echo "OK  $d/clubs.json"
  else
    echo "SKIP $d (introuvable)"
  fi
done
if [ -f "$BASE/sqorz_stats/perf-rankings.json" ] && [ -d "$BASE/ranking_stats" ]; then
  cp "$BASE/sqorz_stats/perf-rankings.json" "$BASE/ranking_stats/perf-rankings.json"
  echo "OK  ranking_stats/perf-rankings.json"
else
  echo "SKIP perf-rankings.json"
fi
