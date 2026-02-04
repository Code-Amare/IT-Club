from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from utils.auth import JWTCookieAuthentication
from .models import LearningTask, TaskReview, LearningTaskLimit
from .serializers import (
    LearningTaskSerializer,
    TaskReviewSerializer,
    LearningTaskLimitSerializer,
)
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from django.db import transaction
from django.contrib.auth import get_user_model
from django.db.models import Q
from asgiref.sync import async_to_sync
from utils.notif import notify_user


User = get_user_model()


class MyLearningTaskView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        tasks = LearningTask.objects.filter(user=user)
        task_limit, created = LearningTaskLimit.objects.get_or_create(user=user)
        task_rated = LearningTask.objects.filter(user=user, status="rated").count()
        task_under_review = LearningTask.objects.filter(
            user=user, status="under_review"
        ).count()
        task_draft = LearningTask.objects.filter(user=user, status="draft").count()
        task_count = tasks.count()
        if not tasks:
            return Response(
                {
                    "message": "You have no learning tasks yet.",
                    "task_limit": task_limit.limit,
                },
                status=status.HTTP_200_OK,
            )
        serializer = LearningTaskSerializer(tasks, many=True)
        return Response(
            {
                "task_count": task_count,
                "task_rated": task_rated,
                "task_draft": task_draft,
                "task_limit": task_limit.limit,
                "task_under_review": task_under_review,
                "tasks": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class LearningTaskAllView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tasks = LearningTask.objects.filter(Q(user=request.user) | ~Q(status="draft"))

        if not tasks:
            return Response({"message": "No learning yet."}, status=status.HTTP_200_OK)
        serializer = LearningTaskSerializer(tasks, many=True)

        return Response({"tasks": serializer.data}, status=status.HTTP_200_OK)


@method_decorator(csrf_protect, name="dispatch")
class LearningTaskAPIView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, task_id):
        user = request.user

        try:

            task = LearningTask.objects.get(id=task_id)
            user_liked = task.likes.filter(id=user.id).exists()
            serializer = LearningTaskSerializer(task)
            is_admin = user.is_staff

            if (
                not is_admin
                and not LearningTask.objects.filter(id=task_id, user=user).exists()
                and task.status == "draft"
            ):
                return Response(
                    {"error": "You are not allowed to view this Task."},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            return Response(
                {"task": serializer.data, "user_liked": user_liked},
                status=status.HTTP_200_OK,
            )

        except LearningTask.DoesNotExist:
            return Response(
                {"message": "Task not found."}, status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def post(self, request):
        try:

            serializer = LearningTaskSerializer(
                data=request.data, context={"request": request}
            )

            task_limit, created = LearningTaskLimit.objects.get_or_create(
                user=request.user
            )
            if not task_limit.is_valid():
                return Response(
                    {"error": "You have reached your task creation limit."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            with transaction.atomic():
                task_limit.created()
                if serializer.is_valid():
                    serializer.save(user=request.user)

                    return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except LearningTaskLimit.DoesNotExist:
            return Response(
                {"error": "Your task limit is not set. Contact the admin."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, task_id):
        try:
            task = LearningTask.objects.get(id=task_id, user=request.user)
            if task.status == "rated":
                return Response(
                    {"error": "Tasks cannot be edited after being rated."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            serializer = LearningTaskSerializer(task, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except LearningTask.DoesNotExist:
            return Response(
                {"error": "Task not found or not owned by you."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, task_id):
        try:
            task = LearningTask.objects.get(id=task_id, user=request.user)
            task_limit = LearningTaskLimit.objects.get(user=request.user)

            if task.status == "rated":
                return Response(
                    {"error": "Tasks cannot be deleted after being rated."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            with transaction.atomic():
                task.delete()
                task_limit.deleted()
            return Response(
                {"message": "Task deleted successfully."},
                status=status.HTTP_204_NO_CONTENT,
            )
        except LearningTaskLimit.DoesNotExist:
            return Response(
                {"error": "Your task limit is not set. Contact the admin."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except LearningTask.DoesNotExist:
            return Response(
                {"error": "Task not found."}, status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_protect, name="dispatch")
class TaskReviewAPIView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, task_id):
        try:
            user = request.user
            task = LearningTask.objects.get(id=task_id)
            task_owner = task.user

            if task.status == "rated" and user.is_staff:
                return Response(
                    {"error": "This task has already been rated by an admin."}
                )

            with transaction.atomic():
                async_to_sync(notify_user)(
                    recipient=task_owner,
                    actor=user,
                    title=f"Learning task {"rated" if user.is_staff else "review"}",
                    description=(
                        "Your learning task has been rated."
                        if user.is_staff
                        else "Your got a review on your learning task."
                    ),
                    code="info",
                    url=f"/user/learning-task/{task.id}",
                    is_push_notif=True,
                )
                if request.user.is_staff:

                    task.status = "rated"
                    task.save()

                serializer = TaskReviewSerializer(data=request.data)
                if serializer.is_valid():
                    serializer.save(
                        user=request.user, task=task, is_admin=request.user.is_staff
                    )
                    return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except LearningTask.DoesNotExist:
            return Response(
                {"error": "Task not found"}, status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, task_id):
        try:
            task = LearningTask.objects.get(id=task_id)
            review = TaskReview.objects.get(task=task, user=request.user)
            task_owner = task.user
            user = request.user

            rated = (
                TaskReview.objects.filter(
                    task=task,
                    user__is_staff=True,
                    task__status="rated",
                )
                .exclude(user=user)
                .exists()
            )

            if rated and user.is_staff and review.user is not user:

                return Response(
                    {
                        "error": "This task has already been rated by another admin and cannot be modified."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            serializer = TaskReviewSerializer(review, data=request.data, partial=True)
            if serializer.is_valid():
                async_to_sync(notify_user)(
                    recipient=task_owner,
                    actor=user,
                    title="Learning task review updated",
                    description="Your learning task review has been updated.",
                    code="info",
                    url=f"/user/learning-task/{task.id}",
                    is_push_notif=True,
                )
                serializer.save()
                return Response(serializer.data, status=status.HTTP_202_ACCEPTED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        except LearningTask.DoesNotExist:
            return Response(
                {"error": "Task not found"}, status=status.HTTP_404_NOT_FOUND
            )
        except TaskReview.DoesNotExist:
            return Response(
                {"message": "Review not found. You can create one with POST."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_protect, name="dispatch")
class LikeLearningTaskAPIView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, task_id):
        user = request.user
        try:
            task = LearningTask.objects.get(id=task_id)
            task_owner = task.user

            with transaction.atomic():
                if user in task.likes.all():
                    task.likes.remove(user)
                    action = "unliked"
                    async_to_sync(notify_user)(
                        recipient=task_owner,
                        actor=user,
                        title="You got a dislike",
                        description=f"{user.full_name} disliked your learning task.",
                        code="info",
                        url=f"/user/learning-task/{task.id}",
                        is_push_notif=False,
                    )

                else:
                    task.likes.add(user)
                    action = "liked"
                    async_to_sync(notify_user)(
                        recipient=task_owner,
                        actor=user,
                        title="You got a like",
                        description=f"{user.full_name} liked your learning task.",
                        code="info",
                        url=f"/user/learning-task/{task.id}",
                        is_push_notif=False,
                    )

            return Response(
                {
                    "task_id": task.id,
                    "action": action,
                    "total_likes": task.likes.count(),
                },
                status=status.HTTP_200_OK,
            )

        except LearningTask.DoesNotExist:
            return Response(
                {"message": "Task not found"}, status=status.HTTP_404_NOT_FOUND
            )

        except Exception as e:
            print(str(e))
            return Response(
                {"error": "Unable to like or unlike."},
                status=status.HTTP_400_BAD_REQUEST,
            )


class LearningTaskLimitView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        task_limit, created = LearningTaskLimit.objects.get_or_create(user=user)

        serializer = LearningTaskLimitSerializer(task_limit)

        return Response({"task_limit": serializer.data}, status=status.HTTP_200_OK)
 