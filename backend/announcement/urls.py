from django.urls import path
from .views import AnnouncementView

urlpatterns = [
    path("", AnnouncementView.as_view(), name="get-all"),
    path("<int:pk>/", AnnouncementView.as_view(), name="announcement-crud"),
]
