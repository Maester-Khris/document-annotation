#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

mkdir -p backend/data backend/documents/uploads
sqlite3 backend/data/app.db < backend/schema.sql
echo "DB initialized at backend/data/app.db"
