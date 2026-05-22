from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from pydantic import EmailStr
import os
from dotenv import load_dotenv

load_dotenv(".env.local")

conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("GMAIL_USER"),
    MAIL_PASSWORD=os.getenv("GMAIL_APP_PASSWORD"),
    MAIL_FROM=f"Pantry Vision <{os.getenv('GMAIL_USER')}>",
    MAIL_PORT=587,
    MAIL_SERVER="smtp.gmail.com",
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True
)

async def send_email(email_to: str, subject: str, template: str):
    message = MessageSchema(
        subject=subject,
        recipients=[email_to],
        body=template,
        subtype="html"
    )
    fm = FastMail(conf)
    await fm.send_message(message)
