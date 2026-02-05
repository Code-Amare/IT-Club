from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAdminUser
from utils.auth import JWTCookieAuthentication
from .models import Attendance, AttendanceSession
from django.contrib.auth import get_user_model
from .serializers import (
    AttendanceSessionSerializer,
    UpdateSessionSerializer,
    AttendanceSerializer,
)
from django.db import transaction

User = get_user_model()


class AttendanceSessionAllView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAdminUser]

    def get(self, request):

        sessions = AttendanceSession.objects.all()
        serializer = AttendanceSessionSerializer(sessions, many=True)
        return Response({"sessions": serializer.data}, status=status.HTTP_200_OK)


class AttendanceSessionVeiw(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAdminUser]

    def get(self, request, session_id):
        try:
            session = AttendanceSession.objects.get(id=session_id)
            attendances = Attendance.objects.filter(session=session)

            session_serializer = AttendanceSessionSerializer(session)
            attendance_serializer = AttendanceSerializer(attendances, many=True)
            return Response(
                {
                    "session": session_serializer.data,
                    "attendances": attendance_serializer.data,
                },
                status=status.HTTP_200_OK,
            )
        except AttendanceSession.DoesNotExist:
            return Response(
                {"error": "Session doesn't exist."}, status=status.HTTP_404_NOT_FOUND
            )

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


class AttendanceAPIView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAdminUser]

    @transaction.atomic
    def post(self, request, session_id):
        # Fetch session
        try:
            session = AttendanceSession.objects.prefetch_related("targets").get(
                id=session_id
            )
            if session.is_ended:
                return Response(
                    {"error": "Attendance session has been ended."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except AttendanceSession.DoesNotExist:
            return Response(
                {"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND
            )

        # Get attendances from request
        attendances_data = request.data.get("attendances", [])
        if not isinstance(attendances_data, list) or not attendances_data:
            return Response(
                {"error": "attendances must be a non-empty list"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Determine valid users
        session_target_ids = set(session.targets.values_list("id", flat=True))
        valid_attendances = [
            a for a in attendances_data if a.get("user") in session_target_ids
        ]

        errors = []
        created_attendances = []
        updated_attendances = []

        # Map existing attendances
        existing_attendances = Attendance.objects.filter(
            session=session, user_id__in=session_target_ids
        )
        existing_map = {a.user_id: a for a in existing_attendances}

        for item in attendances_data:
            user_id = item.get("user")
            if not user_id:
                errors.append({"error": "Missing user ID", "item": item})
                continue
            if user_id not in session_target_ids:
                errors.append({"error": "User not in session targets", "user": user_id})
                continue

            # If attendance exists, update; else create new
            instance = existing_map.get(user_id)
            serializer = AttendanceSerializer(
                instance=instance,
                data={**item, "session": session.id},
                partial=bool(instance),
            )

            if serializer.is_valid():
                saved = serializer.save(session=session, user_id=user_id)
                if instance:
                    updated_attendances.append(user_id)
                else:
                    created_attendances.append(user_id)
            else:
                errors.append({"user": user_id, "errors": serializer.errors})

        return Response(
            {
                "created": created_attendances,
                "updated": updated_attendances,
                "errors": errors,
            },
            status=status.HTTP_200_OK,
        )


class CloseAttendanceSessionAPIView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAdminUser]

    def post(self, request, session_id):

        try:
            session = AttendanceSession.objects.prefetch_related("targets").get(
                id=session_id
            )
        except AttendanceSession.DoesNotExist:
            return Response(
                {"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND
            )

        if session.is_ended:
            return Response(
                {"error": "Session already closed"}, status=status.HTTP_400_BAD_REQUEST
            )

        target_user_ids = set(session.targets.values_list("id", flat=True))

        attended_user_ids = set(
            Attendance.objects.filter(session=session).values_list("user_id", flat=True)
        )

        absent_user_ids = target_user_ids - attended_user_ids

        if absent_user_ids:
            Attendance.objects.bulk_create(
                [
                    Attendance(session=session, user_id=user_id, status="absent")
                    for user_id in absent_user_ids
                ]
            )

        session.is_ended = True
        session.save(update_fields=["is_ended"])

        return Response(
            {
                "message": "Session closed successfully",
                "marked_absent": list(absent_user_ids),
                "total_targets": len(target_user_ids),
            },
            status=status.HTTP_200_OK,
        )


class OpenAttendanceSessionAPIView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAdminUser]

    def post(self, request, session_id):

        try:
            session = AttendanceSession.objects.prefetch_related("targets").get(
                id=session_id
            )
            session.is_ended = False
            session.save()
            return Response(
                {"message": "Session opened successfully"},
                status=status.HTTP_200_OK,
            )
        except AttendanceSession.DoesNotExist:
            return Response(
                {"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND
            )
