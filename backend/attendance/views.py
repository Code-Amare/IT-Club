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
import pandas as pd
import io
import datetime
from django.utils import timezone
from django.http import HttpResponse

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
)
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch

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


class SessionExportPdfView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAdminUser]

    def get(self, request, session_id):

        if not session_id:
            return Response(
                {"detail": "session_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            session = AttendanceSession.objects.get(pk=session_id)
        except AttendanceSession.DoesNotExist:
            return Response(
                {"detail": "AttendanceSession not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not session.is_ended:
            return Response(
                {
                    "detail": "Session is not ended/closed yet. Export allowed only for ended sessions."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        students_qs = session.targets.select_related("profile").all()
        total_students = students_qs.count()

        attendance_qs = Attendance.objects.filter(session=session).select_related(
            "user", "user__profile"
        )
        attendance_map = {att.user_id: att for att in attendance_qs}

        status_counts = {
            "present": attendance_qs.filter(status="present").count(),
            "late": attendance_qs.filter(status="late").count(),
            "absent": attendance_qs.filter(status="absent").count(),
            "special_case": attendance_qs.filter(status="special_case").count(),
        }

        # ---------------------------
        # Build Attendance Table Data
        # ---------------------------
        table_data = [
            ["Full Name", "Email", "Grade", "Section", "Status", "Attended At", "Note"]
        ]

        for user in students_qs:
            att = attendance_map.get(user.id)

            grade = getattr(getattr(user, "profile", None), "grade", "")
            section = getattr(getattr(user, "profile", None), "section", "")
            status_val = att.status if att else "absent"

            attended_at = (
                att.attended_at.strftime("%Y-%m-%d %H:%M:%S")
                if att and att.attended_at
                else ""
            )

            note = att.note if att and att.note else ""

            table_data.append(
                [
                    getattr(user, "full_name", user.email),
                    user.email,
                    grade,
                    section,
                    status_val,
                    attended_at,
                    note,
                ]
            )

        # ---------------------------
        # Create PDF
        # ---------------------------
        buffer = io.BytesIO()

        doc = SimpleDocTemplate(
            buffer,
            pagesize=landscape(A4),
            rightMargin=40,
            leftMargin=40,
            topMargin=40,
            bottomMargin=40,
        )

        elements = []
        styles = getSampleStyleSheet()

        # Title
        elements.append(
            Paragraph(f"<b>Attendance Report: {session.title}</b>", styles["Title"])
        )
        elements.append(Spacer(1, 0.4 * inch))

        # ---------------------------
        # Metadata as Paragraphs (Clean)
        # ---------------------------
        metadata_lines = [
            f"<b>Session ID:</b> {session.id}",
            f"<b>Created At:</b> {session.created_at.strftime('%Y-%m-%d %H:%M:%S')}",
            f"<b>Total Students:</b> {total_students}",
            f"<b>Present:</b> {status_counts['present']}",
            f"<b>Late:</b> {status_counts['late']}",
            f"<b>Absent:</b> {status_counts['absent']}",
            f"<b>Special Case:</b> {status_counts['special_case']}",
            f"<b>Exported At:</b> {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}",
        ]

        for line in metadata_lines:
            elements.append(Paragraph(line, styles["Normal"]))
            elements.append(Spacer(1, 0.15 * inch))

        elements.append(Spacer(1, 0.4 * inch))

        # ---------------------------
        # Attendance Table (80% Width)
        # ---------------------------
        available_width = doc.width
        table_width = available_width * 0.8
        col_count = len(table_data[0])
        col_width = table_width / col_count
        col_widths = [col_width] * col_count

        attendance_table = Table(
            table_data,
            repeatRows=1,
            colWidths=col_widths,
        )

        attendance_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e0e0e0")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.black),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("ALIGN", (4, 1), (4, -1), "CENTER"),  # Status column center
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ]
            )
        )

        elements.append(attendance_table)

        doc.build(elements)
        buffer.seek(0)

        filename = f"{session.title.replace(' ', '_')}_attendance_{session.id}.pdf"

        response = HttpResponse(buffer.read(), content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        return response
