from django.urls import path
from .views import (
    LearningTaskAPIView,
    TaskReviewAPIView,
    LikeLearningTaskAPIView,
    LearningTaskLimitView,
    MyLearningTaskView,
    LearningTaskAllView,
    TaskBonusAPIView,
)

urlpatterns = [
    path("", LearningTaskAPIView.as_view(), name="tasks-list"),
    path("all/", LearningTaskAllView.as_view(), name="tasks-list"),
    path("create/", LearningTaskAPIView.as_view(), name="task-create"),
    path("<int:task_id>/", LearningTaskAPIView.as_view(), name="task-detail"),
    path("my-task/", MyLearningTaskView.as_view(), name="my-task"),
    path("edit/<int:task_id>/", LearningTaskAPIView.as_view(), name="task-edit"),
    path("delete/<int:task_id>/", LearningTaskAPIView.as_view(), name="task-delete"),
    path(
        "delete/<int:task_id>/",
        LearningTaskAPIView.as_view(),
        name="task-delete",
    ),
    path("limit/", LearningTaskLimitView.as_view(), name="task-limit"),
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
    path("bonus/<int:task_id>/", TaskBonusAPIView.as_view(), name="task-bonus"),
]
