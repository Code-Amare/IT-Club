from django.db import models


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
