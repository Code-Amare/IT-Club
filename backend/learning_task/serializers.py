from rest_framework import serializers
from .models import LearningTask, TaskReview, LearningTaskLimit
from management.models import Language, Framework
from django.contrib.auth import get_user_model
from users.serializers import UserSerializer, ProfileSerializer
from users.models import Profile
from management.serializers import LanguageSerializer, FrameworkSerializer


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

    # For nested display
    languages = LanguageSerializer(many=True, read_only=True)
    frameworks = FrameworkSerializer(many=True, read_only=True)

    # For writable input (POST)
    language_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Language.objects.all(), write_only=True, source="languages"
    )
    framework_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Framework.objects.all(),
        write_only=True,
        source="frameworks",
    )

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
            "languages",  # nested read
            "language_ids",  # write-only
            "frameworks",  # nested read
            "framework_ids",  # write-only
            "created_at",
            "updated_at",
            "likes_count",
            "reviews",
            "status",
        ]

    def get_profile(self, obj):
        try:
            return ProfileSerializer(obj.user.profile).data
        except Exception:
            return None

    def get_likes_count(self, obj):
        return obj.likes.count()

    def create(self, validated_data):
        # Pop the IDs for m2m fields
        languages = validated_data.pop("languages", [])
        frameworks = validated_data.pop("frameworks", [])

        # Set the user from context
        user = self.context["request"].user
        validated_data["user"] = user

        # Create the LearningTask
        task = LearningTask.objects.create(**validated_data)

        # Set many-to-many relations
        task.languages.set(languages)
        task.frameworks.set(frameworks)

        return task


class LearningTaskLimitSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = LearningTaskLimit
        fields = ["id", "user", "limit"]
