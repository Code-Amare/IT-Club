from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from asgiref.sync import async_to_sync
from .models import Notification
from utils.auth import JWTCookieAuthentication
from rest_framework.permissions import IsAuthenticated
from .serializers import NotificationSerializer


class GetNotificationBulkView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        base_qs = Notification.objects.filter(recipient=user).select_related("actor")

        unread_count = base_qs.filter(is_read=False).count()

        # Latest 50 notifications (DB-level slicing)
        notif_qs = base_qs.order_by("-sent_at")[:50]

        # Preview = latest 5 unread
        preview_qs = base_qs.filter(is_read=False).order_by("-sent_at")[:5]

        notif_serializer = NotificationSerializer(
            notif_qs,
            many=True,
            context={"request": request},
        )

        preview_serializer = NotificationSerializer(
            preview_qs,
            many=True,
            context={"request": request},
        )

        return Response(
            {
                "notif": notif_serializer.data,
                "notif_preview": preview_serializer.data,
                "unread_count": unread_count,
            },
            status=status.HTTP_200_OK,
        )


class GetNotificationView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, notif_id):
        try:
            notif = Notification.objects.get(recipient=request.user, id=notif_id)
        except Notification.DoesNotExist:
            return Response(
                {"error": "Notification not found."}, status=status.HTTP_404_NOT_FOUND
            )

        notif.is_read = True
        notif.save()
        serializer = NotificationSerializer(notif)
        return Response({"notif": serializer.data}, status=status.HTTP_200_OK)


class MarkAsReadView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        scope = request.data.get("scope", "")
        user = request.user
        if scope and isinstance(scope, (int)):
            notifs = Notification.objects.filter(recipient=user, is_read=False)[:scope]
        else:
            notifs = Notification.objects.filter(recipient=user, is_read=False)

        notifs.update(is_read=True)

        return Response(
            {"detail": f"{notifs.count()} notifications marked as read."},
            status=status.HTTP_200_OK,
        )


class DetailNotifView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, notif_id):
        user = request.user
        try:
            notif = Notification.objects.get(id=notif_id, recipient=user)
            if not notif.is_read:
                notif.is_read = True
                notif.save()

            serializer = NotificationSerializer(notif)
            return Response(
                {"notif": serializer.data},
                status=status.HTTP_200_OK,
            )
        except Notification.DoesNotExist:
            return Response(
                {"error": "Notification doesn't exist."},
                status=status.HTTP_404_NOT_FOUND,
            )
