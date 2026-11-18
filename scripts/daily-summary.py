import csv
import json
import os
import smtplib
import ssl
import sys

from datetime import datetime, timedelta
from email.message import EmailMessage
from pathlib import Path
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo


ROOT = Path(__file__).resolve().parents[1]
TZ = ZoneInfo("Asia/Colombo")


def read_enquiries():
    path = ROOT / "data" / "enquiries.json"
    return json.loads(path.read_text(encoding="utf-8"))


def read_catalogue():
    path = ROOT / "data" / "catalogue.csv"

    with path.open("r", encoding="utf-8-sig", newline="") as file:
        return list(csv.DictReader(file))


def parse_price(value):
    try:
        return float(value.strip().replace(",", ""))
    except (AttributeError, ValueError):
        return None


def build_catalogue_changes(rows):
    history = {}

    for row in rows:
        sku = row["sku"]
        history.setdefault(sku, []).append(row)

    changes = []

    for sku, versions in history.items():
        versions.sort(key=lambda row: row["updated"])

        if len(versions) < 2:
            continue

        old = versions[0]
        new = versions[-1]

        old_price = parse_price(old["price_lkr"])
        new_price = parse_price(new["price_lkr"])

        if (
            old_price is not None
            and new_price is not None
            and old_price != new_price
        ):
            changes.append({
                "sku": sku,
                "product": new["name"],
                "old_price_lkr": old_price,
                "new_price_lkr": new_price,
                "change_lkr": new_price - old_price,
                "updated": new["updated"],
            })

    return changes


def build_summary():
    now = datetime.now(TZ)
    yesterday = now.date() - timedelta(days=1)

    enquiries = read_enquiries()
    catalogue = read_catalogue()

    yesterday_enquiries = [
        item for item in enquiries
        if datetime.fromisoformat(item["received"])
        .astimezone(TZ).date() == yesterday
    ]

    all_dates = [
        datetime.fromisoformat(item["received"])
        .astimezone(TZ).date()
        for item in enquiries
    ]

    changes = build_catalogue_changes(catalogue)

    lines = [
        "LAKESIDE KITCHEN SUPPLY — DAILY SUMMARY",
        f"Report date: {yesterday.isoformat()}",
        f"Generated: {now.isoformat(timespec='seconds')}",
        "",
        f"Customer enquiries yesterday: {len(yesterday_enquiries)}",
    ]

    if yesterday_enquiries:
        for item in yesterday_enquiries:
            lines.append(
                f"- {item['from']} ({item['channel']}): "
                f"{item['text'].replace(chr(10), ' ')[:130]}"
            )
    else:
        lines.append("No enquiries dated yesterday were found in the source file.")

    lines.extend([
        "",
        f"Enquiry source file: {len(enquiries)} records."
    ])

    if all_dates:
        lines.append(
            f"Date coverage: {min(all_dates)} to {max(all_dates)}."
        )

    lines.extend([
        "",
        "QUOTE HISTORY",
        "Actual issued quotes are not currently stored in the repository, "
        "so quote totals and wins cannot be verified by this report.",
        "",
        "CATALOGUE PRICE CHANGES",
    ])

    if changes:
        for item in changes:
            lines.append(
                f"- {item['sku']} — {item['product']}: "
                f"LKR {item['old_price_lkr']:,.2f} -> "
                f"LKR {item['new_price_lkr']:,.2f} "
                f"(change: LKR {item['change_lkr']:+,.2f}; "
                f"updated {item['updated']})"
            )
    else:
        lines.append("No historical price changes found.")

    lines.extend([
        "",
        "NOTE",
        "This report uses the repository's enquiry and catalogue files. "
        "It does not check live Meridian supplier prices or warehouse stock.",
    ])

    summary = "\n".join(lines)

    payload = {
        "source": "quote-desk-cocoon",
        "report_date": yesterday.isoformat(),
        "generated_at": now.isoformat(timespec="seconds"),
        "enquiries_yesterday": len(yesterday_enquiries),
        "catalogue_changes": changes,
        "summary": summary,
    }

    return yesterday, summary, payload


def send_webhook(payload):
    webhook_url = os.environ["COCOON_WEBHOOK_URL"]

    request = Request(
        webhook_url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urlopen(request, timeout=30) as response:
        if not 200 <= response.status < 300:
            raise RuntimeError("Webhook returned an unsuccessful status.")

        print(f"Webhook delivered successfully: HTTP {response.status}")


def send_email(subject, body):
    message = EmailMessage()
    message["From"] = os.environ["SMTP_USERNAME"]
    message["To"] = os.environ["REPORT_TO"]
    message["Subject"] = subject
    message.set_content(body)

    host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    port = int(os.environ.get("SMTP_PORT", "465"))

    if port == 465:
        with smtplib.SMTP_SSL(
            host,
            port,
            context=ssl.create_default_context(),
            timeout=30,
        ) as server:
            server.login(
                os.environ["SMTP_USERNAME"],
                os.environ["SMTP_PASSWORD"],
            )
            server.send_message(message)
    else:
        with smtplib.SMTP(host, port, timeout=30) as server:
            server.starttls(context=ssl.create_default_context())
            server.login(
                os.environ["SMTP_USERNAME"],
                os.environ["SMTP_PASSWORD"],
            )
            server.send_message(message)

    print("Summary email sent successfully.")


def main():
    yesterday, summary, payload = build_summary()

    errors = []

    try:
        send_webhook(payload)
    except Exception as error:
        print(f"Webhook delivery failed: {type(error).__name__}")
        errors.append("Webhook delivery failed.")

    try:
        send_email(
            f"Lakeside Daily Summary — {yesterday.isoformat()}",
            summary,
        )
    except Exception as error:
        print(f"Email delivery failed: {type(error).__name__}")
        errors.append("Email delivery failed.")

    if errors:
        try:
            send_email(
                "ALERT: Lakeside daily automation failed",
                "The daily summary automation did not complete successfully.\n\n"
                + "\n".join(errors)
                + "\n\nCheck the GitHub Actions run for details.",
            )
        except Exception:
            print("Could not send the failure notification.")

        sys.exit(1)


if __name__ == "__main__":
    main()
