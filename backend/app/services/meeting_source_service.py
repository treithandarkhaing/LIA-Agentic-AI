from __future__ import annotations

import re
from html.parser import HTMLParser
from urllib.parse import urlparse


class _IframeSrcParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.src = ""

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "iframe":
            return
        attrs_dict = {key.lower(): value for key, value in attrs}
        self.src = attrs_dict.get("src") or ""


class MeetingSourceService:
    def validate_url(self, url: str) -> bool:
        parsed = urlparse(url.strip())
        return parsed.scheme in {"http", "https"} and bool(parsed.netloc)

    def parse_embed_code(self, embed_code: str) -> str:
        cleaned = embed_code.strip().replace('\\"', '"').replace("\\'", "'")
        parser = _IframeSrcParser()
        parser.feed(cleaned)
        if parser.src:
            return parser.src.strip()

        match = re.search(r"https?://[^\s\"'<>]+", cleaned)
        if match:
            return match.group(0)
        return ""

    def detect_platform(self, url: str) -> tuple[str, str]:
        host = urlparse(url).netloc.lower()
        path = urlparse(url).path.lower()

        if "teams.microsoft" in host or "teams.live" in host:
            return "Microsoft Teams", "Teams meeting recording"
        if "stream.microsoft" in host or "microsoftstream" in host or "/stream/" in path:
            return "Microsoft Stream", "Stream recording"
        if "sharepoint.com" in host:
            return "SharePoint", "SharePoint recording"
        return "Generic URL", "External meeting source"

    def normalize_link(self, url: str) -> dict:
        cleaned = url.strip()
        if not self.validate_url(cleaned):
            raise ValueError("A valid http or https meeting URL is required")
        platform_name, source_type = self.detect_platform(cleaned)
        return {
            "source_url": cleaned,
            "platform_name": platform_name,
            "source_type": source_type,
            "ingestion_method": "link",
            "source_status": "Validated",
            "meeting_title": self._title_for_platform(platform_name),
        }

    def normalize_embed(self, embed_code: str) -> dict:
        source_url = self.parse_embed_code(embed_code)
        if not source_url or not self.validate_url(source_url):
            raise ValueError("Embed code must include a valid iframe src or recording URL")
        platform_name, source_type = self.detect_platform(source_url)
        return {
            "source_url": source_url,
            "embed_code": embed_code.strip(),
            "platform_name": platform_name,
            "source_type": source_type,
            "ingestion_method": "embed",
            "source_status": "Embed parsed",
            "meeting_title": self._title_for_platform(platform_name),
        }

    def _title_for_platform(self, platform_name: str) -> str:
        return "Operational Meeting Record"
