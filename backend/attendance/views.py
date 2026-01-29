from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAdminUser
from utils.auth import JWTCookieAuthentication
from .models import Attendance, AttendanceSession
from django.contrib.auth import get_user_model
from .serializers import AttendanceSessionSerializer, UpdateSessionSerializer

User = get_user_model()


class AttendanceSessionVeiw(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAdminUser]

    def get(self, request):
        sessions = AttendanceSession.objects.prefetch_related("targets")
        serializer = AttendanceSessionSerializer(sessions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        users = request.data.get("users", [])
        title = request.data.get("title", "")

        if not isinstance(users, list):
            return Response(
                {"error": "Users must be a list of IDs"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not users:
            return Response(
                {"error": "No users selected."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not title:
            return Response(
                {"error": "Title is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing_users = User.objects.filter(id__in=users)
        existing_ids = set(existing_users.values_list("id", flat=True))
        invalid_users = [u for u in users if u not in existing_ids]

        if invalid_users:
            return Response(
                {"error": {"invalid_users": invalid_users}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        session = AttendanceSession.objects.create(title=title)
        session.targets.set(existing_users)

        return Response(
            {"message": "Session created", "session_id": session.id},
            status=status.HTTP_201_CREATED,
        )

    def put(self, request, session_id):
        return self._update(request, session_id)

    def patch(self, request, session_id):
        return self._update(request, session_id)

    def _update(self, request, session_id):
        try:
            session = AttendanceSession.objects.get(id=session_id)
        except AttendanceSession.DoesNotExist:
            return Response(
                {"error": "Session not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = UpdateSessionSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data

        # update title
        if "title" in data:
            session.title = data["title"]
            session.save()

        # update users
        if "users" in data:
            users = data["users"]
            qs = User.objects.filter(id__in=users)

            if qs.count() != len(users):
                return Response(
                    {"error": "Some users do not exist"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            session.targets.set(qs)

        return Response(
            {"message": "Session updated successfully"},
            status=status.HTTP_200_OK,
        )

    def delete(self, request, session_id):
        try:
            session = AttendanceSession.objects.get(id=session_id)
        except AttendanceSession.DoesNotExist:
            return Response(
                {"error": "Session not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        session.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
