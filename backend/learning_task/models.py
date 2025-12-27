from django.db import models
from django.contrib.auth import get_user_model
from website.models import Language, Framework
from django.core.validators import MinValueValidator, MaxValueValidator


User = get_user_model()


class LearningTask(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=100)
    description = models.TextField()
    git_link = models.URLField(max_length=500, blank=True, null=True)
    is_public = models.BooleanField(default=True)
    languages = models.ManyToManyField(Language)
    frameworks = models.ManyToManyField(Framework, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    likes = models.ManyToManyField(User, related_name="liked_tasks", blank=True)

    def total_likes(self):
        return self.likes.count()

    def __str__(self):
        return f"{self.title} - {self.user.full_name}"


class TaskReview(models.Model):
    task = models.ForeignKey(
        LearningTask, on_delete=models.CASCADE, related_name="reviews"
    )
    admin = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="task_reviews"
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(5)]
    )  # 0–5
    feedback = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.task.title} - {self.rating}/5"


class TaskFeedbacks(models.Model):
    task = models.ForeignKey(LearningTask, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    feedback = models.CharField(300)
    created_at = models.DateTimeField(auto_now_add=True)
    rating = models.PositiveSmallIntegerField()

    def __str__(self):
        return f"{self.user.full_name} - {self.task.title}"
