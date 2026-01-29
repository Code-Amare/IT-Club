from rest_framework import serializers
from .models import AttendanceSession


class AttendanceSessionSerializer(serializers.ModelSerializer):
    users = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceSession
        fields = ("id", "title", "users", "created_at", "is_ended")

    def get_users(self, obj):
        return list(obj.targets.values_list("id", flat=True))


class UpdateSessionSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=150, required=False)
    users = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
    )
