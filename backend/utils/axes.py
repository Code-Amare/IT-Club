from axes.models import AccessAttempt
from django.conf import settings
from django.utils import timezone


# def get_lockout_remaining(email, ip_address=None):
#     attempts = AccessAttempt.objects.filter(username=email).order_by("-attempt_time")
#     if not attempts.exists():
#         return 0, 0  # No lockout

#     last_attempt = attempts.first()
#     cooloff = settings.AXES_COOLOFF_TIME
#     if hasattr(cooloff, "total_seconds"):
#         cooloff_seconds = cooloff.total_seconds()
#     else:
#         cooloff_seconds = cooloff

#     elapsed = (timezone.now() - last_attempt.attempt_time).total_seconds()
#     remaining = max(0, cooloff_seconds - elapsed)
#     minutes = int(remaining // 60)
#     seconds = int(remaining % 60)
#     return minutes, seconds


def get_lockout_remaining(username, ip_address=None):
    cooloff = settings.AXES_COOLOFF_TIME
    cooloff_seconds = (
        cooloff.total_seconds() if hasattr(cooloff, "total_seconds") else cooloff
    )
    now = timezone.now()

    # 1. IP-only attempts
    ip_attempts = (
        AccessAttempt.objects.filter(ip_address=ip_address).order_by("-attempt_time")
        if ip_address
        else []
    )
    ip_remaining = 0
    if ip_attempts:
        last_ip_attempt = ip_attempts.first()
        ip_elapsed = (now - last_ip_attempt.attempt_time).total_seconds()
        ip_remaining = max(0, cooloff_seconds - ip_elapsed)

    # 2. Username-only attempts
    username_attempts = AccessAttempt.objects.filter(username=username).order_by(
        "-attempt_time"
    )
    username_remaining = 0
    if username_attempts.exists():
        last_username_attempt = username_attempts.first()
        username_elapsed = (now - last_username_attempt.attempt_time).total_seconds()
        username_remaining = max(0, cooloff_seconds - username_elapsed)

    # 3. IP + username attempts
    ip_username_remaining = 0
    if ip_address:
        ip_username_attempts = AccessAttempt.objects.filter(
            username=username, ip_address=ip_address
        ).order_by("-attempt_time")
        if ip_username_attempts.exists():
            last_ip_username_attempt = ip_username_attempts.first()
            ip_username_elapsed = (
                now - last_ip_username_attempt.attempt_time
            ).total_seconds()
            ip_username_remaining = max(0, cooloff_seconds - ip_username_elapsed)

    # Take the shortest remaining time
    remaining = min(ip_remaining, username_remaining, ip_username_remaining)
    minutes = int(remaining // 60)
    seconds = int(remaining % 60)
    return minutes, seconds


def get_client_ip(request):
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        ip = x_forwarded_for.split(",")[0].strip()
    else:
        ip = request.META.get("REMOTE_ADDR")
    return ip
