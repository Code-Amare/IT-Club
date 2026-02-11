from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .models import Announcement
from .serializers import AnnoucementSerializer
from users.serializers import UserInverseSerializer
from utils.auth import RolePermissionFactory
from utils.auth import JWTCookieAuthentication


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
            serializer = AnnoucementSerializer(announcement)
            return Response(serializer.data)

        # list all announcements
        announcements = Announcement.objects.all().order_by(
            "-announcement_date", "-created_at"
        )
        serializer = AnnoucementSerializer(announcements, many=True)
        return Response(serializer.data)

    def post(self, request):

        serializer = AnnoucementSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(created_by=request.user)
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

        serializer = AnnoucementSerializer(
            announcement, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
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
