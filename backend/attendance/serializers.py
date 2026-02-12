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
        read_only_fields = ["id", "attended_at"]

    def validate(self, attrs):
        instance = self.instance
        new_status = attrs.get("status", getattr(instance, "status", None))
        note = attrs.get("note", getattr(instance, "note", None))

        # If status is special_case → note is required
        if new_status == "special_case":
            if not note or note.strip() == "":
                raise serializers.ValidationError(
                    {"note": "This field is required for special_case status."}
                )

        # If status is NOT special_case → note must be empty
        if new_status != "special_case" and note:
            raise serializers.ValidationError(
                {"note": "Note is only allowed when status is 'special_case'."}
            )

        return attrs

    def update(self, instance, validated_data):
        new_status = validated_data.get("status", instance.status)

        # If changing FROM special_case to something else → clear note
        if instance.status == "special_case" and new_status != "special_case":
            validated_data["note"] = None

        return super().update(instance, validated_data)

    def create(self, validated_data):
        # If created with non-special_case → remove note
        if validated_data.get("status") != "special_case":
            validated_data["note"] = None

        return super().create(validated_data)


class AttendanceWithSessionSerializer(serializers.ModelSerializer):
    session = AttendanceSessionNoUsersSerializer(read_only=True)

    class Meta:
        model = Attendance
        fields = ["id", "session", "user", "attended_at", "status", "note"]
