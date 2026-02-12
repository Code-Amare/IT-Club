from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from .models import Announcement
from .serializers import AnnouncementSerializer, AnnouncementMinimalSerializer
from users.serializers import UserInverseSerializer
from utils.auth import RolePermissionFactory
from utils.auth import JWTCookieAuthentication
from asgiref.sync import async_to_sync
from utils.notif import notify_users_bulk


@method_decorator(csrf_protect, name="dispatch")
class AnnouncementView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated, RolePermissionFactory(["admin", "staff"])]

    def get(self, request, pk=None):

        if pk:
            try:
                announcement = Announcement.objects.get(pk=pk)
            except Announcement.DoesNotExist:
                return Response(
                    {"error": f"Announcement with id {pk} not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            serializer = AnnouncementSerializer(announcement)
            return Response(serializer.data)

        # list all announcements
        announcements = Announcement.objects.all().order_by(
            "-announcement_date", "-created_at"
        )
        serializer = AnnouncementSerializer(announcements, many=True)
        return Response(serializer.data)

    def post(self, request):

        serializer = AnnouncementSerializer(data=request.data)
        if serializer.is_valid():
            with transaction.atomic():
                announcement = serializer.save(created_by=request.user)
                users = list(announcement.targets.all())

                async_to_sync(notify_users_bulk)(
                    recipients=users,
                    actor=request.user,
                    title="Annoucement",
                    description="You have a new annoucement.",
                    code="info",
                    url=f"/user/announcement/{announcement.id}",
                    is_push_notif=True,
                )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, pk=None):
        if not pk:
            return Response(
                {"error": "Announcement ID is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            announcement = Announcement.objects.get(pk=pk)
        except Announcement.DoesNotExist:
            return Response(
                {"error": "Announcement not found"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = AnnouncementSerializer(
            announcement, data=request.data, partial=True
        )

        if serializer.is_valid():
            with transaction.atomic():
                # Capture original state
                original_data = {
                    "title": announcement.title,
                    "content": announcement.content,
                    "announcement_date": announcement.announcement_date,
                    "is_important": announcement.is_important,
                    "targets": list(announcement.targets.values_list("id", flat=True)),
                }

                # Save updated instance
                announcement = serializer.save()

                # Capture updated state
                updated_data = {
                    "title": announcement.title,
                    "content": announcement.content,
                    "announcement_date": announcement.announcement_date,
                    "is_important": announcement.is_important,
                    "targets": list(announcement.targets.values_list("id", flat=True)),
                }

                # Check if anything changed
                if original_data == updated_data:
                    return Response(
                        {"warning": "No changes were made to the announcement."},
                        status=status.HTTP_406_NOT_ACCEPTABLE,
                    )

                # Notify users because something changed
                users = list(announcement.targets.all())
                async_to_sync(notify_users_bulk)(
                    recipients=users,
                    actor=request.user,
                    title="Announcement updated",
                    description=f"The announcement '{announcement.title}' has been updated.",
                    code="info",
                    url=f"/user/announcement/{announcement.id}",
                    is_push_notif=True,
                )

            return Response(serializer.data, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk=None):

        if not pk:
            return Response(
                {"error": "Announcement ID is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            announcement = Announcement.objects.get(pk=pk)
        except Announcement.DoesNotExist:
            return Response(
                {"error": "Announcement not found"}, status=status.HTTP_404_NOT_FOUND
            )

        announcement.delete()
        return Response(
            {"message": "Announcement deleted successfully"}, status=status.HTTP_200_OK
        )


class UserAnnouncementView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, pk=None):

        user = request.user
        if pk:
            try:
                announcement = Announcement.objects.get(pk=pk, targets=user)
            except Announcement.DoesNotExist:
                return Response(
                    {"error": f"Announcement with id {pk} not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            serializer = AnnouncementSerializer(announcement)
            return Response(serializer.data)

        announcements = user.announcements.all()
        serializer = AnnouncementMinimalSerializer(announcements, many=True)
        if not announcements.exists():
            return Response(
                {"error": "No announcements yet"}, status=status.HTTP_404_NOT_FOUND
            )
        return Response({"announcements": serializer.data}, status=status.HTTP_200_OK)
