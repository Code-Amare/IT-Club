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
    LanguageBulkAPIView,
    FrameworkGetAPIView,
    FrameworkAPIView,
    FrameworkBulkAPIView,
)

urlpatterns = [
    path("students/", StudentsView.as_view(), name="students-list"),
    path("students/stats/", StudentsStatsView.as_view(), name="students-stats"),
    path("students/create/", StudentCreateView.as_view(), name="student-create"),
    path(
        "student/<int:student_id>/", StudentDetailView.as_view(), name="student-detail"
    ),
    path("bulk-upload/", StudentsBulkUploadView.as_view(), name="students-bulk-upload"),
    path("export/", StudentsExportView.as_view(), name="students-export"),
    path("stats/", StudentsStatsView.as_view(), name="students-stats"),
    path("template/", StudentTemplateView.as_view(), name="student-template"),
    path("languages/", LanguageAPIView.as_view(), name="languages-list"),
    path("languages/<int:pk>/", LanguageAPIView.as_view(), name="language-update"),
    path("languages/bulk/", LanguageBulkAPIView.as_view(), name="languages-bulk"),
    path("frameworks/", FrameworkGetAPIView.as_view(), name="frameworks-list"),
    path("frameworks/<int:pk>/", FrameworkAPIView.as_view(), name="framework-update"),
    path("frameworks/bulk/", FrameworkBulkAPIView.as_view(), name="frameworks-bulk"),
]
