"""Test setup. When ARAN_CLOUD_DATABASE_URL is set (the Cloud under test runs on Postgres), the tests that open the
Cloud database file to inspect it get the same adapter the Cloud uses, so they read Postgres instead."""
import os
import sqlite3
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

URL = os.environ.get("ARAN_CLOUD_DATABASE_URL")
if URL:
    import db

    _real_connect = sqlite3.connect
    _cloud_db = os.environ.get("ARAN_CLOUD_DB") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "cloud.db")

    def _connect(path, *a, **kw):
        if os.path.abspath(str(path)) == os.path.abspath(_cloud_db):
            return db.connect(str(path), URL)
        return _real_connect(path, *a, **kw)

    sqlite3.connect = _connect
