from django.db import models


class Language(models.Model):
    name = models.CharField(50)
    color = models.CharField(20)

    def __str__(self):
        return self.name


class Framework(models.Model):
    language = models.ForeignKey(Language, on_delete=models.CASCADE)
    name = models.CharField(50)

    def __str__(self):
        return f"{self.name} - {self.language.name}"
