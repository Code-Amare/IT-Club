# from axes.models import AccessAttempt
# from django.conf import settings
# from django.utils import timezone


# def get_lockout_remaining(username, ip_address=None):
#     cooloff = settings.AXES_COOLOFF_TIME
#     cooloff_seconds = (
#         cooloff.total_seconds() if hasattr(cooloff, "total_seconds") else cooloff
#     )
#     now = timezone.now()

#     # 1. IP-only attempts
#     ip_attempts = (
#         AccessAttempt.objects.filter(ip_address=ip_address).order_by("-attempt_time")
#         if ip_address
#         else []
#     )
#     ip_remaining = 0
#     if ip_attempts:
#         last_ip_attempt = ip_attempts.first()
#         ip_elapsed = (now - last_ip_attempt.attempt_time).total_seconds()
#         ip_remaining = max(0, cooloff_seconds - ip_elapsed)

#     # 2. Username-only attempts
#     username_attempts = AccessAttempt.objects.filter(username=username).order_by(
#         "-attempt_time"
#     )
#     username_remaining = 0
#     if username_attempts.exists():
#         last_username_attempt = username_attempts.first()
#         username_elapsed = (now - last_username_attempt.attempt_time).total_seconds()
#         username_remaining = max(0, cooloff_seconds - username_elapsed)

#     # 3. IP + username attempts
#     ip_username_remaining = 0
#     if ip_address:
#         ip_username_attempts = AccessAttempt.objects.filter(
#             username=username, ip_address=ip_address
#         ).order_by("-attempt_time")
#         if ip_username_attempts.exists():
#             last_ip_username_attempt = ip_username_attempts.first()
#             ip_username_elapsed = (
#                 now - last_ip_username_attempt.attempt_time
#             ).total_seconds()
#             ip_username_remaining = max(0, cooloff_seconds - ip_username_elapsed)

#     # Take the shortest remaining time
#     remaining = min(ip_remaining, username_remaining, ip_username_remaining)
#     minutes = int(remaining // 60)
#     seconds = int(remaining % 60)
#     return minutes, seconds


# def get_client_ip(request):
#     x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
#     if x_forwarded_for:
#         ip = x_forwarded_for.split(",")[0].strip()
#     else:
#         ip = request.META.get("REMOTE_ADDR")
#     return ip


from axes.models import AccessAttempt
from django.conf import settings
from django.utils import timezone


def get_client_ip(request):
    """
    Extract client IP address from request
    """
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        ip = x_forwarded_for.split(",")[0].strip()
    else:
        ip = request.META.get("REMOTE_ADDR")
    return ip


def get_lockout_remaining(username, ip_address=None):
    """
    Calculate remaining lockout time for a username and/or IP address
    Returns: (minutes, seconds)
    """
    cooloff = settings.AXES_COOLOFF_TIME
    cooloff_seconds = (
        cooloff.total_seconds() if hasattr(cooloff, "total_seconds") else cooloff
    )
    now = timezone.now()

    remaining_times = []

    # 1. IP-only lockout
    if ip_address:
        ip_attempts = AccessAttempt.objects.filter(ip_address=ip_address).order_by(
            "-attempt_time"
        )
        if ip_attempts.exists():
            last_ip_attempt = ip_attempts.first()
            ip_elapsed = (now - last_ip_attempt.attempt_time).total_seconds()
            ip_remaining = max(0, cooloff_seconds - ip_elapsed)
            remaining_times.append(ip_remaining)

    # 2. Username-only lockout
    username_attempts = AccessAttempt.objects.filter(username=username).order_by(
        "-attempt_time"
    )
    if username_attempts.exists():
        last_username_attempt = username_attempts.first()
        username_elapsed = (now - last_username_attempt.attempt_time).total_seconds()
        username_remaining = max(0, cooloff_seconds - username_elapsed)
        remaining_times.append(username_remaining)

    # 3. IP + Username lockout
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
            remaining_times.append(ip_username_remaining)

    # If no lockouts found
    if not remaining_times:
        return 0, 0

    # Take the maximum remaining time (strictest lockout)
    remaining = max(remaining_times)
    minutes = int(remaining // 60)
    seconds = int(remaining % 60)
    return minutes, seconds


def is_user_locked(request, email):
    """
    Check if user is locked and return remaining time info
    Returns: (is_locked, minutes, seconds)
    """
    ip_address = get_client_ip(request)
    minutes, seconds = get_lockout_remaining(email, ip_address)

    # User is locked if either minutes or seconds > 0
    is_locked = minutes > 0 or seconds > 0
    return is_locked, minutes, seconds


def get_lockout_message(minutes, seconds):
    """
    Generate appropriate lockout message based on remaining time
    """
    if minutes == 0:
        return f"User will be allowed to login again in {seconds} second{'' if seconds == 1 else 's'}."
    elif minutes == 1:
        return "User will be allowed to login again in 1 minute."
    else:
        return f"User will be allowed to login again in {minutes} minutes."
