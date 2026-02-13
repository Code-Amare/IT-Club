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


class AdminAction(models.Model):

    class ActionChoices(models.TextChoices):
        ADD_STUDENT = "add_student", "Add Student"
        UPDATE_STUDENT = "update_student", "Update Student"
        DELETE_STUDENT = "delete_student", "Delete Student"
        BULK_STUDENT_ADD = "bulk_student_add", "Bulk Student Add"
        DELETE_LEARNING_TASK = "delete_learning_task", "Delete Learning Task"
        RATE_LEARNING_TASK = "rate_learning_task", "Rate Learning Task"
        GIVE_LEARNING_TASK_BONUS = (
            "give_learning_task_bonus",
            "Give Learning Task Bonus",
        )
        UPDATE_LEARNING_TASK_BONUS = (
            "update_learning_task_bonus",
            "Update Learning Task Bonus",
        )
        SET_LEARNING_TASK_REDO = "set_learning_task_redo", "Set Learning Task Redo"
        SET_TASK_LIMIT = "set_task_limit", "Set Task Limit"
        INCREMENT_TASK_LIMIT = "increment_task_limit", "Increment Task Limit"
        DECREMENT_TASK_LIMIT = "decrement_task_limit", "Decrement Task Limit"
        ADD_LANGUAGE = "add_language", "Add Language"
        DELETE_LANGUAGE = "delete_language", "Delete Language"
        ADD_FRAMEWORK = "add_framework", "Add Framework"
        DELETE_FRAMEWORK = "delete_framework", "Delete Framework"
        UPDATE_LANGUAGE = "update_language", "Update Language"
        UPDATE_FRAMEWORK = "update_framework", "Update Framework"
        CREATE_ATTENDANCE_SESSION = (
            "create_attendance_session",
            "Create Attendance Session",
        )
        OPEN_ATTENDANCE_SESSION = "open_attendance_session", "Open Attendance Session"
        CLOSE_ATTENDANCE_SESSION = (
            "close_attendance_session",
            "Close Attendance Session",
        )
        DELETE_ATTENDANCE_SESSION = (
            "delete_attendance_session",
            "Delete Attendance Session",
        )
        SET_ATTENDANCE_RECORD = "set_attendance_record", "Set Attendance Record"
        CREATE_ANNOUNCEMENT = "create_announcement", "Create Announcement"
        EDIT_ANNOUNCEMENT = "edit_announcement", "Edit Announcement"
        DELETE_ANNOUNCEMENT = "delete_announcement", "Delete Announcement"

    admin = models.ForeignKey(User, on_delete=models.CASCADE)
    model_name = models.CharField(max_length=100)
    object_id = models.IntegerField()
    before_data = models.JSONField(null=True, blank=True)
    after_data = models.JSONField(null=True, blank=True)
    action = models.CharField(max_length=50, choices=ActionChoices.choices)
    created_at = models.DateTimeField(auto_now_add=True)
