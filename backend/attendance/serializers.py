from rest_framework import serializers
from .models import AttendanceSession, Attendance
from users.serializers import UserInverseSerializer


class AttendanceSessionSerializer(serializers.ModelSerializer):
    users = UserInverseSerializer(many=True, read_only=True, source="targets")

    class Meta:
        model = AttendanceSession
        fields = (
            "id",
            "title",
            "created_at",
            "is_ended",
            "targets",
            "users",
        )


class AttendanceSessionNoUsersSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceSession
        fields = ["id", "title", "is_ended", "created_at"]


class UpdateSessionSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=150, required=False)
    users = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
    )


class AttendanceSerializer(serializers.ModelSerializer):
    user = UserInverseSerializer(read_only=True)

    class Meta:
        model = Attendance
        fields = ["id", "session", "user", "attended_at", "status", "note"]

    def validate(self, attrs):
        status = attrs.get("status", getattr(self.instance, "status", None))
        note = attrs.get("note", getattr(self.instance, "note", None))

        if status == "special_case" and (note is None or note.strip() == ""):
            raise serializers.ValidationError(
                {"note": "This field is required for special_case status."}
            )

        return attrs


class AttendanceWithSessionSerializer(serializers.ModelSerializer):
    session = AttendanceSessionNoUsersSerializer(read_only=True)

    class Meta:
        model = Attendance
        fields = ["id", "session", "user", "attended_at", "status", "note"]
