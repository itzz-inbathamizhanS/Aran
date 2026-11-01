"""A real AI provider for the AI gateway: Claude through the official Anthropic SDK.

Used when ANTHROPIC_API_KEY is set (ARAN_CLAUDE_MODEL picks the model). The gateway has
already replaced every identifier with a placeholder such as <AADHAAR_1> before this is
called, so Claude only ever sees placeholders, and the gateway puts the real values back
into the reply for the staff member."""
import os

SYSTEM = ("You are a careful customer-care assistant at an Indian bank, helping a staff member "
          "draft short, polite replies. Text in angle brackets such as <PER_1> or <AADHAAR_1> are "
          "placeholders for protected values: copy them exactly as written, never guess or invent "
          "the real value, and never ask for full ID or card numbers.")


def claude_upstream(model=None, max_tokens=1024, timeout=30.0):
    import anthropic

    client = anthropic.Anthropic(timeout=timeout, max_retries=1)  # key from ANTHROPIC_API_KEY
    model = model or os.environ.get("ARAN_CLAUDE_MODEL", "claude-opus-5-5")

    def call(messages):
        system = "\n\n".join([SYSTEM] + [m["content"] for m in messages if m.get("role") == "system"])
        msgs = [{"role": m["role"], "content": m["content"]} for m in messages if m.get("role") in ("user", "assistant")]
        resp = client.beta.messages.create(
            model=model, max_tokens=max_tokens, system=system, messages=msgs,
            output_config={"effort": "low"},  # short chat replies; keeps latency down
            betas=["server-side-fallback-2026-07-01"], fallbacks="default",
        )
        if resp.stop_reason == "refusal":
            return "The assistant declined to draft this reply. Please write it yourself."
        return "".join(b.text for b in resp.content if b.type == "text").strip()
    return call
