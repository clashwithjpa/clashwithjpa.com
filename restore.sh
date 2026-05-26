#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: ./restore.sh <path-to-dump.sql or .zip>"
  exit 1
fi

FILE="$1"

# Drop and recreate the jpa database
echo "Resetting 'jpa' database..."
docker exec -i jpa-db psql -U postgres -d postgres <<EOF
DROP DATABASE IF EXISTS jpa WITH (FORCE);
CREATE DATABASE jpa;
EOF

# Restore
if [[ "$FILE" == *.zip ]]; then
  TMPDIR=$(mktemp -d)
  unzip -q "$FILE" -d "$TMPDIR"
  SQL=$(find "$TMPDIR" -name "*.sql" | head -n1)
  echo "Restoring from: $SQL"
  cat "$SQL" | docker exec -i jpa-db psql -U postgres -d jpa
  rm -rf "$TMPDIR"
else
  echo "Restoring from: $FILE"
  cat "$FILE" | docker exec -i jpa-db psql -U postgres -d jpa
fi

echo "Done."