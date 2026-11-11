"""Cloud-AI brain for the squad.

All model calls run through Emergent's LLM gateway (emergentintegrations).
Per the integration playbook every call uses stream_message() — we accumulate
the TextDeltas server-side, persist the final text and let the UI poll it.

Any failure returns None so callers fall back to simulated content:
the squad never goes silent, it just announces the fallback.
"""

import asyncio
import logging
import os
import re
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, StreamDone, TextDelta, UserMessage

# Self-load .env (same idiom as lib/db.py) so standalone scripts/snippets see the key too.
load_dotenv(Path(__file__).parent.parent / ".env")

logger = logging.getLogger(__name__)

_last_ok_at: datetime | None = None


def llm_configured() -> bool:
    return bool(os.environ.get("EMERGENT_LLM_KEY", "").strip())


async def llm_text(
    system_message: str,
    prompt: str,
    session_id: str,
    provider: str = "openai",
    model: str = "gpt-5.4",
    timeout_s: float = 90.0,
) -> str | None:
    """One brain round-trip → full text, or None on any failure."""
    global _last_ok_at

    key = os.environ.get("EMERGENT_LLM_KEY", "").strip()
    if not key:
        logger.warning("EMERGENT_LLM_KEY not set — brain runs simulated")
        return None

    try:
        chat = LlmChat(
            api_key=key,
            session_id=session_id,
            system_message=system_message,
        ).with_model(provider, model)

        parts: list[str] = []

        async def drain() -> None:
            async for event in chat.stream_message(UserMessage(text=prompt)):
                if isinstance(event, TextDelta):
                    parts.append(event.content)
                elif isinstance(event, StreamDone):
                    return

        await asyncio.wait_for(drain(), timeout=timeout_s)
        text = "".join(parts).strip()
        if not text:
            logger.warning("llm_text(%s/%s): empty completion", provider, model)
            return None
        _last_ok_at = datetime.now(timezone.utc)
        return text
    except Exception as exc:  # timeout, auth, provider outage — degrade, never crash
        logger.warning("llm_text(%s/%s) failed: %s", provider, model, exc)
        return None


def llm_json(text: str | None) -> dict | None:
    """Parse a JSON object out of a model reply (tolerates ``` fences and prose)."""
    if not text:
        return None

    candidate = text.strip()
    fence = re.search(r"```(?:json)?\s*(.+?)```", candidate, re.DOTALL)
    if fence:
        candidate = fence.group(1).strip()

    try:
        data = json_loads(candidate)
    except Exception:
        start, end = candidate.find("{"), candidate.rfind("}")
        if start == -1 or end <= start:
            return None
        try:
            data = json_loads(candidate[start : end + 1])
        except Exception:
            return None

    return data if isinstance(data, dict) else None


def json_loads(raw: str) -> object:
    import json

    return json.loads(raw)
