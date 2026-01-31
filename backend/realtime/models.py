from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Notifaction(models.Model):

    recipient = models.ForeignKey(
        User, related_name="notifications", on_delete=models.CASCADE
    )
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    is_system = models.CharField()
    title = models.CharField(max_length=50)
    description = models.TextField()
    url = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
