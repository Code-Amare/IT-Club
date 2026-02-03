import time
from asgiref.sync import sync_to_async
from channels.layers import get_channel_layer
from realtime.models import Notification

import cloudinary
import cloudinary.utils
import environ
from pathlib import Path

# ───────────────────────────────────────────────
# ENV / CLOUDINARY (loaded once)
# ───────────────────────────────────────────────
env = environ.Env()
BASE_DIR = Path(__file__).resolve().parent
env.read_env(BASE_DIR / ".env")

cloudinary.config(
    cloud_name=env("CLOUD_NAME"),
    api_key=env("API_KEY"),
    api_secret=env("API_SECRET"),
    secure=True,
)

# ───────────────────────────────────────────────
# CONSTANTS
# ───────────────────────────────────────────────
VALID_CODES = {"success", "error", "info", "warning"}
CHANNEL_LAYER = get_channel_layer()


# ───────────────────────────────────────────────
# HELPERS
# ───────────────────────────────────────────────
@sync_to_async
def _create_notification(**kwargs):
    return Notification.objects.create(**kwargs)


@sync_to_async
def _signed_profile_url(public_id: str | None, expires_in: int = 30):
    if not public_id:
        return None

    url, _ = cloudinary.utils.cloudinary_url(
        public_id,
        resource_type="image",
        type="authenticated",
        sign_url=True,
        secure=True,
        expires_at=int(time.time()) + expires_in,
    )
    return url


async def _serialize_actor(actor):
    if not actor:
        return None

    return {
        "id": actor.id,
        "full_name": actor.full_name,
        "email": actor.email,
        "profile_pic_url": await _signed_profile_url(
            getattr(actor, "profile_pic_id", None)
        ),
    }


# ───────────────────────────────────────────────
# MAIN API
# ───────────────────────────────────────────────
async def notify_user(
    *,
    recipient,
    title: str,
    description: str,
    code: str = "info",
    actor=None,
    url: str | None = None,
    is_push_notif: bool = False,
):
    if not recipient or not recipient.id:
        raise ValueError("Recipient is required")

    if not title:
        raise ValueError("Notification title is required")

    if code not in VALID_CODES:
        code = "info"

    # Prevent self-notification
    if actor and actor.id == recipient.id:
        return None

    actor_data = await _serialize_actor(actor)

    # 1️⃣ Persist notification (source of truth)
    notification = await _create_notification(
        recipient=recipient,
        actor=actor,
        title=title,
        description=description,
        code=code,
        url=url,
    )

    # 2️⃣ Real-time push (non-fatal)
    try:
        await CHANNEL_LAYER.group_send(
            f"user_{recipient.id}",
            {
                "type": "send_notification",
                "respond": {
                    "id": notification.id,
                    "title": title,
                    "message": description,
                    "code": code,
                    "url": url,
                    "is_read": False,
                    "is_push_notif": is_push_notif,
                    "actor": actor_data,
                    "sent_at": notification.sent_at.isoformat(),
                },
            },
        )
    except Exception as exc:
        # Never break request due to WS
        print("WS notify failed:", exc)

    return notification


# ───────────────────────────────────────────────
# LIGHTWEIGHT LIVE UPDATE (NO DB)
# ───────────────────────────────────────────────
async def live_update(recipient, /, **payload):
    if not recipient or not recipient.id:
        raise ValueError("Recipient is required")

    try:
        await CHANNEL_LAYER.group_send(
            f"user_{recipient.id}",
            {
                "type": "send_notification",
                "respond": {
                    "live_update": True,
                    **payload,
                },
            },
        )
    except Exception as exc:
        print("WS live update failed:", exc)
