from pathlib import Path
from threading import Thread
from pprint import pprint
from django.conf import settings

import environ
from sib_api_v3_sdk import ApiClient, Configuration
from sib_api_v3_sdk.api.transactional_emails_api import TransactionalEmailsApi
from sib_api_v3_sdk.models import SendSmtpEmail
from sib_api_v3_sdk.rest import ApiException


EMAIL_HOST_USER = settings.EMAIL_HOST_USER

env = environ.Env()
BASE_DIR = Path(__file__).resolve().parent.parent
environ.Env.read_env(str(BASE_DIR / ".env"))


def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    sender_name: str = "MyApp",
    sender_email: str = None,
):
    sender_email = sender_email or EMAIL_HOST_USER
    api_key = env("BREVO_API_KEY")

    if not sender_email:
        raise ValueError("EMAIL_HOST_USER is not configured")

    if not api_key:
        raise ValueError("BREVO_API_KEY is not configured")

    def _send():
        try:
            configuration = Configuration()
            configuration.api_key["api-key"] = api_key

            api_instance = TransactionalEmailsApi(
                ApiClient(configuration)
            )

            email = SendSmtpEmail(
                to=[{"email": to_email}],
                sender={
                    "name": sender_name,
                    "email": sender_email,
                },
                subject=subject,
                html_content=html_content,
            )

            response = api_instance.send_transac_email(email)

            print("Brevo response:")
            pprint(response)

        except ApiException as e:
            print("Brevo API error:", e)

        except Exception as e:
            print("Email error:", e)

    Thread(target=_send, daemon=True).start()