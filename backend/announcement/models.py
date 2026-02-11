from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Announcement(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    announcement_date = models.DateField(null=True, blank=True)

    targets = models.ManyToManyField(User, related_name="announcements", blank=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="created_announcements"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_important = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.title} ({self.announcement_date if self.announcement_date else 'No date'})"
