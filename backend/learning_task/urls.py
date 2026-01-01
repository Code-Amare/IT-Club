from django.urls import path
from .views import (
    LearningTaskAPIView,
    TaskReviewAPIView,
    LikeLearningTaskAPIView,
    LearningTaskLimitView,
)

urlpatterns = [
    path("", LearningTaskAPIView.as_view(), name="tasks-list"),
    path("create/", LearningTaskAPIView.as_view(), name="task-create"),
    path("edit/<int:task_id>/", LearningTaskAPIView.as_view(), name="task-edit"),
    path("delete/<int:task_id>/", LearningTaskAPIView.as_view(), name="task-delete"),
    path("<int:task_id>/", LearningTaskAPIView.as_view(), name="task-detail"),
    path(
        "task-limit/<int:task_id>/", LearningTaskLimitView.as_view(), name="task-limit"
    ),
    path(
        "review/create/<int:task_id>/",
        TaskReviewAPIView.as_view(),
        name="task-review-create",
    ),
    path(
        "review/edit/<int:task_id>/",
        TaskReviewAPIView.as_view(),
        name="task-review-edit",
    ),
    path("like/<int:task_id>/", LikeLearningTaskAPIView.as_view(), name="task-like"),
]
