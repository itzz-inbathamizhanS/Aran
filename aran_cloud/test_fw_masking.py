"""The fallback masker (used when a copy is held because the core did not answer) hides identifiers but keeps dates."""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import fw_core  # noqa: E402


def test_dates_stay_readable():
    assert fw_core.mask_text('{"day": "2026-11-05"}') == '{"day": "2026-11-05"}'
    assert fw_core.mask_text("paid on 20261105") == "paid on 20261105"


def test_identifiers_are_masked():
    assert fw_core.mask_text("mobile 9876543210") == "mobile XXXXXX3210"
    assert fw_core.mask_text("aadhaar 2490 1748 7341") == "aadhaar XXXXXXXX7341"
    assert fw_core.mask_text("account 50104034160249") == "account XXXXXXXXXX0249"
    assert fw_core.mask_text("card 4111 1111 1111 1111") == "card XXXXXXXXXXXX1111"

