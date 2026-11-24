import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import httpx


def is_email_configured() -> bool:
    return bool(
        (os.environ.get("RESEND_API_KEY") or "").strip()
        or (
            (os.environ.get("SMTP_HOST") or "").strip()
            and (os.environ.get("SMTP_USER") or "").strip()
            and (os.environ.get("SMTP_PASS") or "").strip()
        )
    )


def send_password_reset_email(to_email: str, reset_code: str) -> bool:
    """
    Sends a 6-digit password reset code via Resend API (RESEND_API_KEY)
    or standard SMTP (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS).
    Returns True if sent successfully.
    """
    subject = "MY_DOC — Код восстановления пароля / Password Reset Code"
    text_body = (
        f"Здравствуйте!\n\n"
        f"Ваш код для восстановления пароля в MY_DOC: {reset_code}\n"
        f"Код действителен 15 минут.\n\n"
        f"Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.\n\n"
        f"---\n"
        f"Hello!\n\n"
        f"Your MY_DOC password reset code is: {reset_code}\n"
        f"This code expires in 15 minutes.\n"
    )
    html_body = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 16px;">
      <h2 style="margin: 0 0 8px; color: #18181b; font-size: 20px;">MY_DOC — Восстановление пароля</h2>
      <p style="margin: 0 0 20px; color: #52525b; font-size: 14px; line-height: 1.5;">
        Вы запросили сброс пароля для вашего аккаунта. Введите этот 6-значный код в приложении:
      </p>
      <div style="text-align: center; padding: 16px; background: #f4f4f5; border-radius: 12px; margin-bottom: 20px;">
        <span style="font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #18181b;">{reset_code}</span>
      </div>
      <p style="margin: 0; color: #71717a; font-size: 12px;">
        Код действителен <strong>15 минут</strong>. Если вы не запрашивали восстановление пароля, просто проигнорируйте это письмо.
      </p>
    </div>
    """

    # Option 1: Resend API (recommended for Vercel)
    resend_key = (os.environ.get("RESEND_API_KEY") or "").strip()
    if resend_key:
        email_from = (os.environ.get("EMAIL_FROM") or "MY_DOC <onboarding@resend.dev>").strip()
        try:
            resp = httpx.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {resend_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": email_from,
                    "to": [to_email],
                    "subject": subject,
                    "text": text_body,
                    "html": html_body,
                },
                timeout=15.0,
            )
            if resp.status_code in (200, 201):
                return True
            print(f"[Email/Resend Error] {resp.status_code}: {resp.text}")
        except Exception as e:
            print(f"[Email/Resend Exception] {e}")

    # Option 2: Standard SMTP (Gmail, Yandex, Brevo, etc.)
    smtp_host = (os.environ.get("SMTP_HOST") or "").strip()
    smtp_user = (os.environ.get("SMTP_USER") or "").strip()
    smtp_pass = (os.environ.get("SMTP_PASS") or "").strip()
    if smtp_host and smtp_user and smtp_pass:
        smtp_port = int(os.environ.get("SMTP_PORT", "587"))
        email_from = (os.environ.get("EMAIL_FROM") or smtp_user).strip()
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = email_from
            msg["To"] = to_email
            msg.attach(MIMEText(text_body, "plain", "utf-8"))
            msg.attach(MIMEText(html_body, "html", "utf-8"))

            if smtp_port == 465:
                with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=15) as server:
                    server.login(smtp_user, smtp_pass)
                    server.sendmail(email_from, [to_email], msg.as_string())
            else:
                with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
                    server.starttls()
                    server.login(smtp_user, smtp_pass)
                    server.sendmail(email_from, [to_email], msg.as_string())
            return True
        except Exception as e:
            print(f"[Email/SMTP Exception] {e}")

    return False
