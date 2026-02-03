from channels.layers import get_channel_layer
from realtime.models import Notification
from asgiref.sync import sync_to_async


VALID_CODES = {
    "success",
    "error",
    "info",
    "warning",
}


async def notify_user(
    *,
    recipient,
    title,
    description,
    code="info",
    actor=None,
    url=None,
    is_push_notif=False,
):

    if code not in VALID_CODES:
        code = "info"

    if actor and actor.id == recipient.id:
        return

    notification = await sync_to_async(Notification.objects.create)(
        recipient=recipient,
        actor=actor,
        title=title,
        description=description,
        code=code,
        url=url,
    )

    # 2️⃣ Send real-time WS notification
    channel_layer = get_channel_layer()

    await channel_layer.group_send(
        f"user_{recipient.id}",
        {
            "type": "send_notification",
            "respond": {
                "id": notification.id,
                "title": title,
                "actor_id": actor.id if actor else None,
                "message": description,
                "code": code,
                "url": url,
                "is_push_notif": is_push_notif,
                "created_at": notification.created_at.isoformat(),
            },
        },
    )

    return notification
