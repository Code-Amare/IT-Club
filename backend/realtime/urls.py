from django.urls import path
from .views import GetNotificationView

urlpatterns = [
    path("notif/", GetNotificationView.as_view(), name="get-notif"),
]
