# aran_edge: the self-hosted data plane. Build from the repository root:
#   docker build -f aran_edge/Dockerfile -t aran-edge .
# It is small on purpose: it needs only the shared cleaning helpers (aran_cloud/fw_core.py) and its own code.
# The core it talks to (ARAN_CORE_URL) runs in your network; the main Aran image can be used instead
# (docker compose --profile edge up edge) because that image already contains aran_edge/.
FROM python:3.13-slim
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
WORKDIR /srv
RUN pip install --no-cache-dir "fastapi>=0.110" "uvicorn>=0.29" "requests>=2.31" "cryptography>=42"
COPY aran_cloud/fw_core.py aran_cloud/fw_core.py
COPY aran_edge/__init__.py aran_edge/edge.py aran_edge/
ENV PYTHONUNBUFFERED=1 ARAN_EDGE_DB=/srv/data/edge.db
RUN mkdir -p /srv/data
VOLUME /srv/data
EXPOSE 8200
HEALTHCHECK --interval=10s --timeout=3s CMD curl -fs http://localhost:8200/edge/health || exit 1
CMD ["python3", "-m", "uvicorn", "aran_edge.edge:app", "--host", "0.0.0.0", "--port", "8200", "--no-proxy-headers"]

