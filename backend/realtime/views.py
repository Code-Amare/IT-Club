from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from asgiref.sync import async_to_sync
from .models import Notification
from utils.auth import JWTCookieAuthentication
from rest_framework.permissions import IsAdminUser
from .serializers import NotificationSerializer


class GetNotificationView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAdminUser]

    def get(self, request):
        notif = Notification.objects.filter(recipient=request.user).order_by("sent_at")[
            :30
        ]
        serializer = NotificationSerializer(notif, many=True)
        unread_notif = notif.filter(is_read=False)

        return Response(
            {
                "notif": serializer.data,
                "unread_notif": unread_notif,
            },
            status=status.HTTP_200_OK,
        )
