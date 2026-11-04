#!/usr/bin/env bash
# Makes throwaway certificates for the mTLS listener in aran-cloud.conf: a CA for clients, a server certificate and one
# client certificate. For a demo only; use your own CA in production. Prints the client certificate's fingerprint:
# put it in the route's allowed_fingerprints (nginx's $ssl_client_fingerprint is the SHA-1).
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p certs && cd certs
openssl req -x509 -newkey rsa:2048 -nodes -days 30 -subj "/CN=aran-demo-clients-ca" -keyout clients-ca.key -out clients-ca.crt 2>/dev/null
openssl req -x509 -newkey rsa:2048 -nodes -days 30 -subj "/CN=aran.local" -addext "subjectAltName=DNS:aran.local,DNS:*.fw.aran.local" \
  -keyout server.key -out server.crt 2>/dev/null
openssl req -newkey rsa:2048 -nodes -subj "/CN=demo-client" -keyout client.key -out client.csr 2>/dev/null
openssl x509 -req -in client.csr -CA clients-ca.crt -CAkey clients-ca.key -CAcreateserial -days 30 -out client.crt 2>/dev/null
rm -f client.csr
chmod 644 server.key clients-ca.key client.key      # readable by the nginx container; these are throwaway keys
echo "client certificate fingerprint (SHA-1):"
openssl x509 -in client.crt -noout -fingerprint -sha1 | cut -d= -f2 | tr -d ':' | tr 'A-F' 'a-f'

