from channels.layers import get_channel_layer


async def trigger_notification(user_id, message, code, is_push_notif):
    if code not in ["success", "error", "info"]:
        code = "info"
    channel_layer = get_channel_layer()
    await channel_layer.group_send(
        f"user_{user_id}",
        {
            "type": "send_notification",
            "respond": {
                "message": message,
                "code": code,
                "is_push_notif": is_push_notif,
            },
        },
    )
