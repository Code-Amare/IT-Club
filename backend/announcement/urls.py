from django.urls import path
from .views import AnnouncementView, UserAnnouncementView

urlpatterns = [
    path("", AnnouncementView.as_view(), name="get-all"),
    path("<int:pk>/", AnnouncementView.as_view(), name="announcement-crud"),
    path("user/", UserAnnouncementView.as_view(), name="user-announcement"),
    path("user/<int:pk>/", UserAnnouncementView.as_view(), name="user-announcement"),
]
