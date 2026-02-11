from rest_framework import serializers
from .models import Announcement
from users.serializers import UserInverseSerializer


class AnnouncementSerializer(serializers.ModelSerializer):
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
            "content",
            "created_at",
            "updated_at",
            "is_important",
        ]


class AnnouncementMinimalSerializer(serializers.ModelSerializer):
    created_by = UserInverseSerializer(read_only=True)

    class Meta:
        model = Announcement
        fields = [
            "id",
            "title",
            "announcement_date",
            "created_by",
            "content",
            "created_at",
            "updated_at",
            "is_important",
        ]
