from rest_framework import serializers
from .models import LearningTask, TaskReview, LearningTaskLimit, TaskBonus
from management.models import Language, Framework
from django.contrib.auth import get_user_model
from users.serializers import UserSerializer, ProfileSerializer, UserInverseSerializer
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

    languages = LanguageSerializer(many=True, read_only=True)
    frameworks = FrameworkSerializer(many=True, read_only=True)

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
            "languages",
            "language_ids",
            "frameworks",
            "framework_ids",
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
        validated_data.pop("status", None)

        languages = validated_data.pop("languages", [])
        frameworks = validated_data.pop("frameworks", [])

        user = self.context["request"].user
        validated_data["user"] = user

        git_link = validated_data.get("git_link")
        if git_link in [None, ""]:
            validated_data["status"] = "draft"
        else:
            validated_data["status"] = "under_review"

        task = LearningTask.objects.create(**validated_data)
        task.languages.set(languages)
        task.frameworks.set(frameworks)

        return task

    def update(self, instance, validated_data):
        if instance.status == "rated":
            raise serializers.ValidationError(
                {"error": "You cannot update a task that has already been rated."}
            )
        elif instance.status == "under_review":
            raise serializers.ValidationError(
                {"error": "You cannot update a task that is under review."}
            )

        validated_data.pop("status", None)

        languages = validated_data.pop("languages", None)
        frameworks = validated_data.pop("frameworks", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        git_link = validated_data.get("git_link", instance.git_link)
        if git_link in [None, ""]:
            instance.status = "draft"
        else:
            instance.status = "under_review"

        instance.save()

        if languages is not None:
            instance.languages.set(languages)
        if frameworks is not None:
            instance.frameworks.set(frameworks)

        return instance


class LearningTaskLimitSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    value = serializers.IntegerField(write_only=True)
    operation = serializers.ChoiceField(
        choices=["set", "increment", "decrement"], write_only=True
    )

    class Meta:
        model = LearningTaskLimit
        fields = [
            "id",
            "user",
            "limit",
            "value",
            "operation",
        ]

    def create(self, validated_data):
        task_limit = LearningTaskLimit(**validated_data)
        value = validated_data.get("value", 0)
        operation = validated_data.get("operation")

        if operation == "set":
            if value < 0:
                raise serializers.ValidationError("Value can't be less than zero.")
            task_limit.limit = value

        elif operation == "increment":
            task_limit.limit += value

        elif operation == "decrement":
            task_limit.limit = (
                0 if (0 < task_limit.limit - value) else task_limit.limit - value
            )

        task_limit.save()
        return task_limit

    def update(self, instance, validated_data):
        value = validated_data.get("value", 0)
        operation = validated_data.get("operation")

        if operation == "set":
            if value < 0:
                raise serializers.ValidationError("Value can't be less than zero.")
            instance.limit = value

        elif operation == "increment":
            instance.limit += value

        elif operation == "decrement":
            instance.limit = max(instance.limit - value, 0)

        instance.save()
        return instance


class TaskBonusSerializer(serializers.ModelSerializer):
    admin = UserInverseSerializer(read_only=True)
    task = LearningTaskSerializer(read_only=True)

    class Meta:
        model = TaskBonus
        fields = [
            "id",
            "task",
            "admin",
            "score",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "task", "admin", "created_at", "updated_at"]

    def validate_score(self, value):
        if value < 0 or value > 30:
            raise serializers.ValidationError("Bonus score must be between 0 and 20.")
        return value
