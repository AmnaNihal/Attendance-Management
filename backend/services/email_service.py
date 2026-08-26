"""
services/email_service.py
Real SMTP email alerts using Gmail (or any SMTP provider).
"""
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

from config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


def _send_email(to: str, subject: str, html_body: str):
    """Low-level SMTP send."""
    if not settings.smtp_user or not settings.smtp_password:
        logger.warning("SMTP credentials not configured. Email not sent.")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.email_from
    msg["To"] = to
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.email_from, to, msg.as_string())
        logger.info(f"Email sent to {to}: {subject}")
    except Exception as e:
        logger.error(f"Failed to send email: {e}")


def send_low_attendance_alert(student_name: str, student_id: str, percentage: float, recipient: str = None):
    """Alert faculty when a student's attendance drops below threshold."""
    to = recipient or settings.alert_recipient
    subject = f"⚠️ Low Attendance Alert — {student_name} ({student_id})"
    body = f"""
    <html><body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #e53e3e;">Low Attendance Warning</h2>
        <p>Student <strong>{student_name}</strong> ({student_id}) has attendance of
        <strong style="color: #e53e3e;">{percentage:.1f}%</strong>,
        which is below the required threshold.</p>
        <p>Please take necessary action.</p>
        <hr>
        <small style="color: #718096;">AI Attendance Manager · {datetime.now().strftime('%Y-%m-%d %H:%M')}</small>
    </body></html>
    """
    _send_email(to, subject, body)


def send_daily_report(date: str, present: int, absent: int, total: int, recipient: str = None):
    """Send a daily attendance summary to the admin."""
    to = recipient or settings.alert_recipient
    percentage = (present / total * 100) if total > 0 else 0
    subject = f"📊 Daily Attendance Report — {date}"
    body = f"""
    <html><body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #2b6cb0;">Daily Attendance Summary</h2>
        <table style="border-collapse: collapse; width: 300px;">
            <tr style="background: #ebf8ff;">
                <td style="padding: 8px; border: 1px solid #bee3f8;"><strong>Date</strong></td>
                <td style="padding: 8px; border: 1px solid #bee3f8;">{date}</td>
            </tr>
            <tr>
                <td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>Total Students</strong></td>
                <td style="padding: 8px; border: 1px solid #e2e8f0;">{total}</td>
            </tr>
            <tr style="background: #f0fff4;">
                <td style="padding: 8px; border: 1px solid #c6f6d5;"><strong>Present</strong></td>
                <td style="padding: 8px; border: 1px solid #c6f6d5; color: #276749;">{present}</td>
            </tr>
            <tr style="background: #fff5f5;">
                <td style="padding: 8px; border: 1px solid #fed7d7;"><strong>Absent</strong></td>
                <td style="padding: 8px; border: 1px solid #fed7d7; color: #c53030;">{absent}</td>
            </tr>
            <tr style="background: #fefce8;">
                <td style="padding: 8px; border: 1px solid #fef08a;"><strong>Attendance %</strong></td>
                <td style="padding: 8px; border: 1px solid #fef08a;">{percentage:.1f}%</td>
            </tr>
        </table>
        <hr>
        <small style="color: #718096;">AI Attendance Manager · Auto-generated</small>
    </body></html>
    """
    _send_email(to, subject, body)


def send_student_marked_notification(student_name: str, student_id: str, in_time: str, recipient: str = None):
    """Notify when a student is successfully recognized and marked."""
    to = recipient or settings.alert_recipient
    subject = f"✅ Attendance Marked — {student_name}"
    body = f"""
    <html><body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #276749;">Attendance Recorded</h2>
        <p><strong>{student_name}</strong> ({student_id}) was recognized and marked <strong>Present</strong>
        at <strong>{in_time}</strong>.</p>
        <hr>
        <small style="color: #718096;">AI Attendance Manager</small>
    </body></html>
    """
    _send_email(to, subject, body)
