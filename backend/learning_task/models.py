from django.db import models
from django.contrib.auth import get_user_model
from management.models import Language, Framework
from django.core.validators import MinValueValidator, MaxValueValidator


User = get_user_model()


class LearningTask(models.Model):
    STATUS_CHOICE = [
        ("draft", "Draft"),
        ("under_review", "Under Review"),
        ("rated", "Rated"),
        ("redo", "Redo"),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=100)
    description = models.TextField()
    git_link = models.URLField(max_length=500, blank=True, null=True)
    is_public = models.BooleanField(default=True)
    languages = models.ManyToManyField(Language)
    frameworks = models.ManyToManyField(Framework, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICE, default="draft")
    likes = models.ManyToManyField(User, related_name="liked_tasks", blank=True)

    def total_likes(self):
        return self.likes.count()

    def __str__(self):
        return f"{self.title} - {self.user.full_name}"


class TaskReview(models.Model):
    task = models.ForeignKey(
        LearningTask, on_delete=models.CASCADE, related_name="reviews"
    )
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="task_reviews"
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(5)]
    )
    feedback = models.TextField()
    is_admin = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["task", "user"], name="unique_review_per_user_per_task"
            )
        ]

    def __str__(self):
        return f"{self.user} - {self.task.title} ({self.rating}/5)"


class LearningTaskLimit(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="task_limit")
    limit = models.PositiveIntegerField(default=0)

    def created(self):
        if self.limit > 0:
            self.limit -= 1
            self.save(update_fields=["limit"])

    def deleted(self):
        self.limit += 1
        self.save(update_fields=["limit"])

    def is_valid(self):
        return self.limit > 0
