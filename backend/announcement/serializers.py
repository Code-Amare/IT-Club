from rest_framework import serializers
from .models import Announcement
from users.serializers import UserInverseSerializer


class AnnoucementSerializer(serializers.ModelSerializer):
    created_by = UserInverseSerializer(read_only=True)
    users = UserInverseSerializer(many=True, read_only=True, source="targets")

    class Meta:
        model = Announcement
        fields = [
            "id",
            "title",
            "announcement_date",
            "targets",
            "users",
            "created_by",
            "created_at",
            "updated_at",
            "is_important",
        ]
