#!/usr/bin/env bash
# Play N bot-vs-bot games and summarise the outcomes.
#   ./run_batch.sh <N> <P1> <P2> [outdir] [parallel]
# e.g. ./run_batch.sh 100 MCTS MCTS logs/mcts_mirror 3
#
# Build first:  gradle installDist
set -euo pipefail

N=${1:-100}
P1=${2:-Random}
P2=${3:-Random}
OUT=${4:-logs/${P1}_vs_${P2}}
PAR=${5:-1}

LIB="$(dirname "$0")/build/install/sevenwondersduel/lib"
[ -d "$LIB" ] || { echo "Not built. Run: gradle installDist" >&2; exit 1; }

# ponytail: one subdir per game because game ids are timestamps with 1s
# resolution, so parallel games would otherwise clobber each other's logs.
# Settings go through the environment, not into the command string: macOS xargs -I
# refuses commands longer than 255 bytes, which a long output path would exceed.
export P1 P2 OUT LIB JAVA_OPTS
seq 1 "$N" | xargs -P "$PAR" -I{} sh -c '
  d="$OUT/game_$1"
  mkdir -p "$d"
  java ${JAVA_OPTS:-} -cp "$LIB/*" com.aigamelabs.swduel.Main -P1 "$P1" -P2 "$P2" -L "$d" > "$d/stdout.txt" 2>&1 \
    || echo "game $1 FAILED" >&2
' _ {}

echo
echo "=== $N games: $P1 (P1) vs $P2 (P2) ==="
cat "$OUT"/game_*/*_game.log | grep -E "wins with|scored the same" | awk '
# "Player N wins with X versus Y" | "... with Science/Military Supremacy"
#                                 | "Players scored the same amount of points: X"
/wins with [0-9]/       { n++; win[$2]++; civ++; s1+=$5; s2+=$7; next }
/wins with Science/     { n++; win[$2]++; sci++; next }
/wins with Military/    { n++; win[$2]++; mil++; next }
/scored the same/       { n++; tie++; civ++; next }
END {
  if (n == 0) { print "no completed games found"; exit 1 }
  printf "games completed   %d\n", n
  printf "P1 wins           %3d (%.0f%%)\n", win["1"], 100*win["1"]/n
  printf "P2 wins           %3d (%.0f%%)\n", win["2"], 100*win["2"]/n
  printf "ties              %3d (%.0f%%)\n", tie, 100*tie/n
  printf "\nended by civilian %3d (%.0f%%)\n", civ, 100*civ/n
  printf "ended by science  %3d (%.0f%%)\n", sci, 100*sci/n
  printf "ended by military %3d (%.0f%%)\n", mil, 100*mil/n
  if (civ) printf "\nmean VP (civilian games)  P1 %.1f  P2 %.1f\n", s1/civ, s2/civ
}'
