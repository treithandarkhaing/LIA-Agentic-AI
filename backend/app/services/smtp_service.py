from __future__ import annotations

import os
import smtplib
from email.message import EmailMessage
from pathlib import Path

from dotenv import load_dotenv


load_dotenv(Path(__file__).resolve().parents[2] / ".env")


class SMTPServiceError(Exception):
    def __init__(self, message: str, status_code: int = 503) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class SMTPService:
    def send(self, recipients: list[str], subject: str, body: str, attachments: list[dict] | None = None) -> None:
        server = self._env("SMTP_SERVER")
        port = self._port()
        username = self._env("SMTP_USERNAME")
        password = self._env("SMTP_PASSWORD")
        sender = self._env("SENDER_EMAIL") or username
        use_ssl = self._env("SMTP_USE_SSL").lower() in {"1", "true", "yes"}
        use_tls = self._env("SMTP_USE_TLS", "true").lower() not in {"0", "false", "no"}
        recipient_list = self._clean_recipients(recipients)

        if not all([server, username, password, sender]):
            raise SMTPServiceError("SMTP is not configured. Add SMTP_SERVER, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, and SENDER_EMAIL to backend/.env.")
        if not recipient_list:
            raise SMTPServiceError("At least one recipient email is required.", 400)

        message = EmailMessage()
        message["From"] = sender
        message["To"] = ", ".join(recipient_list)
        message["Subject"] = subject
        message.set_content(body)
        for attachment in attachments or []:
            filename = str(attachment.get("filename") or "attachment.txt")
            content = attachment.get("content") or b""
            if isinstance(content, str):
                content = content.encode("utf-8")
            maintype = str(attachment.get("maintype") or "application")
            subtype = str(attachment.get("subtype") or "octet-stream")
            message.add_attachment(content, maintype=maintype, subtype=subtype, filename=filename)

        try:
            if use_ssl:
                with smtplib.SMTP_SSL(server, port, timeout=30) as smtp:
                    smtp.login(username, password)
                    smtp.send_message(message)
            else:
                with smtplib.SMTP(server, port, timeout=30) as smtp:
                    smtp.ehlo()
                    if use_tls:
                        smtp.starttls()
                        smtp.ehlo()
                    smtp.login(username, password)
                    smtp.send_message(message)
        except smtplib.SMTPAuthenticationError as exc:
            raise SMTPServiceError(
                "SMTP authentication failed. For Outlook/Microsoft 365, confirm the mailbox password or app password, and ensure Authenticated SMTP is enabled for this account.",
                401,
            ) from exc
        except smtplib.SMTPRecipientsRefused as exc:
            raise SMTPServiceError("SMTP rejected the recipient address. Check the recipient email and try again.", 400) from exc
        except (smtplib.SMTPConnectError, smtplib.SMTPServerDisconnected, TimeoutError, OSError) as exc:
            raise SMTPServiceError("SMTP connection failed. Check SMTP_SERVER, SMTP_PORT, network access, and TLS settings.", 502) from exc
        except smtplib.SMTPException as exc:
            raise SMTPServiceError(f"SMTP send failed: {exc}", 502) from exc

    def _env(self, key: str, default: str = "") -> str:
        return (os.getenv(key) or default).strip().strip('"').strip("'")

    def _port(self) -> int:
        raw_port = self._env("SMTP_PORT", "587")
        try:
            return int(raw_port)
        except ValueError as exc:
            raise SMTPServiceError("SMTP_PORT must be a number, usually 587 for Outlook/Microsoft 365.", 400) from exc

    def _clean_recipients(self, recipients: list[str]) -> list[str]:
        cleaned: list[str] = []
        for item in recipients:
            for address in str(item).replace(";", ",").split(","):
                address = address.strip()
                if address:
                    cleaned.append(address)
        return cleaned
