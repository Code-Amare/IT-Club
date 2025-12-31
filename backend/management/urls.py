from django.urls import path
from .views import (
    StudentsView,
    StudentDetailView,
    StudentCreateView,
    StudentsBulkUploadView,
    StudentsExportView,
    StudentsStatsView,
    StudentTemplateView,
    LanguageAPIView,
    LanguageGetAPIView,
    LanguageBulkAPIView,
    FrameworkGetAPIView,
    FrameworkAPIView,
    FrameworkGetAPIView,
    FrameworkBulkAPIView,
    LanguageDetailAPIView,
    FrameworkDetailAPIView,
    StudentDeleteView,
    StudentUpdateView,
    TopLearningTasks,
)

urlpatterns = [
    path("students/", StudentsView.as_view(), name="students-list"),
    path("students/stats/", StudentsStatsView.as_view(), name="students-stats"),
    path("students/create/", StudentCreateView.as_view(), name="student-create"),
    path("student/edit/<int:pk>/", StudentUpdateView.as_view(), name="student-edit"),
    path(
        "top-learning-tasks/<int:boundary>/",
        TopLearningTasks.as_view(),
        name="top-learning-tasks",
    ),
    path(
        "student/delete/<int:pk>/", StudentDeleteView.as_view(), name="student-delete"
    ),
    path(
        "student/<int:student_id>/", StudentDetailView.as_view(), name="student-detail"
    ),
    path(
        "students/bulk-upload/",
        StudentsBulkUploadView.as_view(),
        name="students-bulk-upload",
    ),
    path("export/", StudentsExportView.as_view(), name="students-export"),
    path("stats/", StudentsStatsView.as_view(), name="students-stats"),
    path("students/template/", StudentTemplateView.as_view(), name="student-template"),
    path("languages/", LanguageGetAPIView.as_view(), name="languages-list"),
    path("languages/<int:pk>/", LanguageDetailAPIView.as_view(), name="languages-list"),
    path("languages/create/", LanguageAPIView.as_view(), name="language-create"),
    path("languages/edit/<int:pk>/", LanguageAPIView.as_view(), name="language-update"),
    path(
        "languages/delete/<int:pk>/", LanguageAPIView.as_view(), name="language-delete"
    ),
    path("languages/bulk/", LanguageBulkAPIView.as_view(), name="languages-bulk"),
    path("frameworks/", FrameworkGetAPIView.as_view(), name="frameworks-list"),
    path(
        "frameworks/<int:pk>/", FrameworkDetailAPIView.as_view(), name="frameworks-list"
    ),
    path("frameworks/create/", FrameworkAPIView.as_view(), name="framework-create"),
    path(
        "frameworks/edit/<int:pk>/", FrameworkAPIView.as_view(), name="framework-update"
    ),
    path(
        "frameworks/delete/<int:pk>/",
        FrameworkAPIView.as_view(),
        name="framework-delete",
    ),
    path("frameworks/bulk/", FrameworkBulkAPIView.as_view(), name="frameworks-bulk"),
]
