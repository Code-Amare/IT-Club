from rest_framework import serializers
from .models import AttendanceSession
from users.serializers import UserSerializer


class AttendanceSessionSerializer(serializers.ModelSerializer):
    users = UserSerializer(many=True, read_only=True, source="targets")

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


class UpdateSessionSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=150, required=False)
    users = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
    )
