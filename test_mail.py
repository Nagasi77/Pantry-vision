import asyncio
from backend.mail_service import send_email
from backend.email_templates import get_freshness_alert_template

async def test_send_email():
    print("Testing email service...")
    try:
        template = get_freshness_alert_template("Apel", 1)
        await send_email("pyagwd@gmail.com", "Testing Pantry Vision Alert", template)
        print("Email berhasil dikirim ke pyagwd@gmail.com")
    except Exception as e:
        print(f"Gagal mengirim email: {e}")

if __name__ == "__main__":
    asyncio.run(test_send_email())
