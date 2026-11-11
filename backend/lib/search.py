"""Real keyless web search via DuckDuckGo's HTML endpoint (per the integration
playbook). Graceful by contract: any upstream failure returns [].
"""

import logging
from urllib.parse import parse_qs, unquote, urlparse

import httpx
from bs4 import BeautifulSoup

from models.models import SearchHit

logger = logging.getLogger(__name__)

DDG_HTML = "https://html.duckduckgo.com/html/"
MAX_RESULTS = 8
SEARCH_ENGINE = "duckduckgo"


def _destination(href: str) -> str:
    """Unwrap DDG's /l/?uddg=... redirect when present."""
    if not href:
        return ""
    parsed = urlparse(href)
    params = parse_qs(parsed.query)
    if "uddg" in params:
        return unquote(params["uddg"][0])
    return href


async def web_search(query: str) -> list[SearchHit]:
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; QGDoZero/1.0; personal agent)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        "Referer": "https://html.duckduckgo.com/",
    }
    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(8.0, connect=3.0),
            follow_redirects=True,
            headers=headers,
        ) as client:
            response = await client.post(DDG_HTML, data={"q": query})
            # 202/anomaly, 403, 429 and friends are failures, not empty results.
            if response.status_code != 200 or "anomaly" in response.text.lower():
                logger.warning("web_search: ddg status=%s (blocked or empty)", response.status_code)
                return []

        soup = BeautifulSoup(response.text, "html.parser")
        hits: list[SearchHit] = []
        for block in soup.select(".result"):
            title_node = block.select_one("a.result__a")
            if not title_node:
                continue
            url = _destination(title_node.get("href", ""))
            if not url.startswith(("http://", "https://")):
                continue
            snippet_node = block.select_one(".result__snippet")
            hits.append(
                SearchHit(
                    title=title_node.get_text(" ", strip=True),
                    url=url,
                    snippet=snippet_node.get_text(" ", strip=True) if snippet_node else "",
                )
            )
            if len(hits) == MAX_RESULTS:
                break
        return hits
    except Exception as exc:  # keep the public contract graceful
        logger.warning("web_search failed: %s", exc)
        return []
