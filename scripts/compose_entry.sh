#!/bin/sh
# docker compose entry point. The core needs ARAN_MASTER_KEY (encrypts keys at rest) and the
# services share ARAN_INTERNAL_SECRET. Values from .env.local win; otherwise the first service to
# start makes random ones once, on the shared "secrets" volume, so `docker compose up` just works.
set -e
F=/srv/secrets/env
if [ ! -s "$F" ]; then
  mkdir -p /srv/secrets
  (umask 077; python3 -c "import secrets; print('GEN_MASTER_KEY=' + secrets.token_hex(32)); print('GEN_INTERNAL_SECRET=' + secrets.token_hex(32))" > "$F.tmp")
  mv "$F.tmp" "$F"
fi
. "$F"
export ARAN_MASTER_KEY="${ARAN_MASTER_KEY:-$GEN_MASTER_KEY}"
export ARAN_INTERNAL_SECRET="${ARAN_INTERNAL_SECRET:-$GEN_INTERNAL_SECRET}"
exec "$@"
