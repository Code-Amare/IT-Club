from rest_framework import serializers
from .models import LearningTask, TaskReview
from management.models import Language, Framework
from django.contrib.auth import get_user_model

User = get_user_model()


class TaskReviewSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)

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
    user = serializers.StringRelatedField(read_only=True)
    languages = serializers.PrimaryKeyRelatedField(
        queryset=Language.objects.all(), many=True
    )
    frameworks = serializers.PrimaryKeyRelatedField(
        queryset=Framework.objects.all(), many=True, required=False
    )
    likes_count = serializers.SerializerMethodField()
    reviews = TaskReviewSerializer(many=True, read_only=True)

    class Meta:
        model = LearningTask
        fields = [
            "id",
            "user",
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

    def get_likes_count(self, obj):
        return obj.likes.count()
