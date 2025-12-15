from axes.models import AccessAttempt
from django.conf import settings
from django.utils import timezone


def get_lockout_remaining(email, ip_address=None):
    attempts = AccessAttempt.objects.filter(username=email).order_by("-attempt_time")
    if not attempts.exists():
        return None  # No lockout

    last_attempt = attempts.first()
    cooloff = settings.AXES_COOLOFF_TIME
    if hasattr(cooloff, "total_seconds"):
        cooloff_seconds = cooloff.total_seconds()
    else:
        cooloff_seconds = cooloff

    elapsed = (timezone.now() - last_attempt.attempt_time).total_seconds()
    remaining = max(0, cooloff_seconds - elapsed)
    minutes = int(remaining // 60)
    seconds = int(remaining % 60)
    return minutes, seconds
