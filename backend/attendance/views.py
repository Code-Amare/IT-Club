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
import io
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
        if len(errors) > 0:
            return Response({"error": errors}, status=status.HTTP_400_BAD_REQUEST)

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

    MAX_TEXT_LENGTH = 30  # max chars for name and notes

    def truncate(self, text):
        if not text:
            return ""
        return (
            text
            if len(text) <= self.MAX_TEXT_LENGTH
            else text[: self.MAX_TEXT_LENGTH - 3] + "..."
        )

    def get(self, request, session_id):
        if not session_id:
            return Response({"detail": "session_id is required"}, status=400)

        try:
            session = AttendanceSession.objects.get(pk=session_id)
        except AttendanceSession.DoesNotExist:
            return Response({"detail": "AttendanceSession not found"}, status=404)

        if not session.is_ended:
            return Response(
                {
                    "detail": "Session is not ended/closed yet. Export allowed only for ended sessions."
                },
                status=400,
            )

        # Query data
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

        # Build attendance rows with index
        table_data = [
            ["#", "Full Name", "Grade", "Section", "Status", "Attended At", "Note"]
        ]
        for i, user in enumerate(students_qs, start=1):
            att = attendance_map.get(user.id)
            profile = getattr(user, "profile", None)
            full_name = self.truncate(getattr(user, "full_name", user.email))
            grade = getattr(profile, "grade", "")
            section = getattr(profile, "section", "")
            status_val = att.status if att else "absent"
            attended_at = (
                att.attended_at.strftime("%Y-%m-%d %H:%M:%S")
                if att and att.attended_at
                else ""
            )
            note = self.truncate(att.note if att and att.note else "")

            table_data.append(
                [str(i), full_name, grade, section, status_val, attended_at, note]
            )

        # Create PDF buffer
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,  # Portrait
            rightMargin=30,
            leftMargin=30,
            topMargin=30,
            bottomMargin=30,
        )

        elements = []
        styles = getSampleStyleSheet()

        # Title
        elements.append(
            Paragraph(f"<b>Attendance Report: {session.title}</b>", styles["Title"])
        )
        elements.append(Spacer(1, 0.2 * inch))

        # Metadata Section
        metadata_lines = [
            f"Session ID: {session.id}",
            f"Created At: {session.created_at.strftime('%Y-%m-%d %H:%M:%S')}",
            f"Total Students: {total_students}",
            f"Present: {status_counts['present']}",
            f"Late: {status_counts['late']}",
            f"Absent: {status_counts['absent']}",
            f"Special Case: {status_counts['special_case']}",
            f"Exported At: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}",
        ]

        for line in metadata_lines:
            elements.append(Paragraph(line, styles["Normal"]))
        elements.append(Spacer(1, 0.4 * inch))

        # Table width: 90% of page width
        available_width = doc.width
        table_width = available_width * 0.9
        col_widths = [
            table_width * 0.05,  # Index
            table_width * 0.25,  # Full Name
            table_width * 0.12,  # Grade
            table_width * 0.12,  # Section
            table_width * 0.12,  # Status
            table_width * 0.18,  # Attended At
            table_width * 0.16,  # Note
        ]

        # Wrap strings in Paragraphs
        table_data_wrapped = []
        normal_style = styles["Normal"]
        for row in table_data:
            table_data_wrapped.append(
                [Paragraph(str(cell), normal_style) for cell in row]
            )

        attendance_table = Table(table_data_wrapped, repeatRows=1, colWidths=col_widths)
        attendance_table.hAlign = "CENTER"

        # Table style
        attendance_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e0e0e0")),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("ALIGN", (0, 1), (0, -1), "CENTER"),  # index center
                    ("ALIGN", (4, 1), (4, -1), "CENTER"),  # Status center
                    ("LEFTPADDING", (0, 0), (-1, -1), 4),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                    ("TOPPADDING", (0, 0), (-1, -1), 3),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ]
            )
        )

        elements.append(attendance_table)

        # Build PDF
        doc.build(elements)
        buffer.seek(0)

        filename = f"{session.title.replace(' ', '_')}_attendance_{session.id}.pdf"
        response = HttpResponse(buffer.read(), content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        return response
