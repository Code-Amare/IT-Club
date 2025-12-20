from rest_framework import serializers
from django.contrib.auth import get_user_model
import cloudinary.uploader
import cloudinary.utils
import time

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)
    profile_pic_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = "__all__"

    def create(self, validated_data):
        password = validated_data.pop("password")
        profile_pic_file = self.context["request"].FILES.get("profile_pic")
        if profile_pic_file:
            validated_data["profile_pic_id"] = self.upload_private_file(
                profile_pic_file
            )

        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        profile_pic_file = self.context["request"].FILES.get("profile_pic")
        if profile_pic_file:
            validated_data["profile_pic_id"] = self.upload_private_file(
                profile_pic_file
            )

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance

    def get_profile_pic_url(self, obj):
        if obj.profile_pic_id:
            return self.get_signed_url(obj.profile_pic_id)
        return None

    # --- helper methods ---
    def upload_private_file(self, file):
        result = cloudinary.uploader.upload(
            file, folder="users/profiles", resource_type="image", type="authenticated"
        )
        return result["public_id"]

    def get_signed_url(self, public_id, expires_in=30):
        url, _ = cloudinary.utils.cloudinary_url(
            public_id,
            resource_type="image",
            type="authenticated",
            sign_url=True,
            secure=True,
            expires_at=int(time.time()) + expires_in,
        )
        return url
