from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Language(models.Model):
    name = models.CharField(max_length=50, unique=True)
    code = models.CharField(max_length=10, unique=True)
    color = models.CharField(max_length=20)

    def __str__(self):
        return f"{self.name} - {self.code}"


class Framework(models.Model):
    language = models.ForeignKey(Language, on_delete=models.CASCADE)
    name = models.CharField(max_length=50)

    class Meta:
        unique_together = ("language", "name")

    def __str__(self):
        return f"{self.name} - {self.language.name}"


class Setting(models.Model):
    allow_profile_change = models.BooleanField(default=False)
    allow_proifle_pic_change = models.BooleanField(default=False)
