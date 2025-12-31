from rest_framework import serializers
from .models import LearningTask, TaskReview
from management.models import Language, Framework
from django.contrib.auth import get_user_model
from users.serializers import UserSerializer, ProfileSerializer
from users.models import Profile

User = get_user_model()


class TaskReviewSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = TaskReview
        fields = [
            "id",
            "user",
            "rating",
            "feedback",
            "is_admin",
            "created_at",
        ]


class LearningTaskSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    profile = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    reviews = TaskReviewSerializer(many=True, read_only=True)

    class Meta:
        model = LearningTask
        fields = [
            "id",
            "user",
            "profile",
            "title",
            "description",
            "git_link",
            "is_public",
            "languages",
            "frameworks",
            "created_at",
            "updated_at",
            "likes_count",
            "reviews",
        ]

    def get_profile(self, obj):
        try:
            return ProfileSerializer(obj.user.profile).data
        except Profile.DoesNotExist:
            return None

    def get_likes_count(self, obj):
        return obj.likes.count()
