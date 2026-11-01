"""claude_upstream without a network: the SDK client is replaced by a stub."""
import types

import anthropic

from gateway.claude_upstream import claude_upstream


def _stub(monkeypatch, stop_reason="end_turn", text="Dear <PER_1>, we have reversed the charge."):
    seen = {}

    class Beta:
        class messages:
            @staticmethod
            def create(**kw):
                seen.update(kw)
                return types.SimpleNamespace(stop_reason=stop_reason, content=[types.SimpleNamespace(type="text", text=text)])

    monkeypatch.setattr(anthropic, "Anthropic", lambda **kw: types.SimpleNamespace(beta=Beta))
    return seen


def test_sends_placeholders_and_returns_text(monkeypatch):
    seen = _stub(monkeypatch)
    out = claude_upstream("claude-opus-5-5")([{"role": "system", "content": "extra rule"}, {"role": "user", "content": "Reply to <PER_1> about <CARD_1>"}])
    assert out == "Dear <PER_1>, we have reversed the charge."
    assert seen["model"] == "claude-opus-5-5" and seen["messages"] == [{"role": "user", "content": "Reply to <PER_1> about <CARD_1>"}]
    assert "extra rule" in seen["system"] and "placeholders" in seen["system"]


def test_refusal_gives_a_plain_message(monkeypatch):
    _stub(monkeypatch, stop_reason="refusal", text="")
    assert "declined" in claude_upstream()([{"role": "user", "content": "hi"}])
