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

    def get(self, request, session_id):
        try:
            session = AttendanceSession.objects.get(id=session_id)
            serializer = AttendanceSessionSerializer(session)
            return Response({"session": serializer.data}, status=status.HTTP_200_OK)
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

    def post(self, request, session_id):
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

        attendances = request.data.get("attendances", [])
        if not isinstance(attendances, list) or not attendances:
            return Response(
                {"error": "attendances must be a non-empty list"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Determine valid users for this session
        session_target_ids = set(session.targets.values_list("id", flat=True))
        user_ids = [item.get("user") for item in attendances if "user" in item]
        valid_user_ids = set(user_ids) & session_target_ids
        valid_users = User.objects.filter(id__in=valid_user_ids)

        # Prepare for bulk create/update
        errors = []
        attendances_to_create = []

        existing_attendances = Attendance.objects.filter(
            session=session, user_id__in=valid_user_ids
        )
        existing_attendance_map = {a.user_id: a for a in existing_attendances}

        STATUS_CHOICES = dict(Attendance.STATUS_CHOICES)

        for item in attendances:
            user_id = item.get("user")
            status_value = item.get("status", "absent")

            if not user_id:
                errors.append({"error": "Missing user ID", "item": item})
                continue

            if status_value not in STATUS_CHOICES:
                errors.append({"error": "Invalid status", "item": item})
                continue

            if user_id not in valid_user_ids:
                errors.append({"error": "User not in session targets", "user": user_id})
                continue

            if user_id in existing_attendance_map:
                # Update in memory; will bulk update later
                existing_attendance_map[user_id].status = status_value
            else:
                # Create new Attendance instance
                attendances_to_create.append(
                    Attendance(session=session, user_id=user_id, status=status_value)
                )

        # Bulk create new attendances
        if attendances_to_create:
            Attendance.objects.bulk_create(attendances_to_create)

        # Bulk update existing attendances
        if existing_attendance_map:
            Attendance.objects.bulk_update(existing_attendance_map.values(), ["status"])

        return Response(
            {
                "created": [a.user_id for a in attendances_to_create],
                "updated": [a.user_id for a in existing_attendance_map.values()],
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
