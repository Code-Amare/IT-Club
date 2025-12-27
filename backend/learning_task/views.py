from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from utils.auth import JWTCookieAuthentication
from .models import LearningTask, TaskReview
from .serializers import LearningTaskSerializer, TaskReviewSerializer
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect


@method_decorator(csrf_protect, name="dispatch")
class LearningTaskAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, task_id=None):
        try:
            if task_id:
                task = LearningTask.objects.get(id=task_id)
                serializer = LearningTaskSerializer(task)
            else:
                tasks = LearningTask.objects.all()
                serializer = LearningTaskSerializer(tasks, many=True)

            return Response(serializer.data)

        except LearningTask.DoesNotExist:
            return Response(
                {"message": "Task not found"}, status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def post(self, request):
        try:
            serializer = LearningTaskSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save(user=request.user)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, task_id):
        try:
            task = LearningTask.objects.get(id=task_id, user=request.user)
            if task.is_rated:
                return Response(
                    {"error": "Task can't be edited after being rated."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            serializer = LearningTaskSerializer(task, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except LearningTask.DoesNotExist:
            return Response(
                {"message": "Task not found or not owned by user"},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, task_id):
        try:
            task = LearningTask.objects.get(id=task_id, user=request.user)
            if task.is_rated:
                return Response(
                    {"error": "Task can't be deleted after being rated."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            task.delete()
            return Response(
                {"message": "Deleted successfully"}, status=status.HTTP_204_NO_CONTENT
            )
        except LearningTask.DoesNotExist:
            return Response(
                {"message": "Task not found"}, status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

@method_decorator(csrf_protect, name="dispatch")
class TaskReviewAPIView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, task_id):
        try:
            task = LearningTask.objects.get(id=task_id)
            serializer = TaskReviewSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save(
                    user=request.user, task=task, is_admin=request.user.is_staff
                )
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except LearningTask.DoesNotExist:
            return Response(
                {"message": "Task not found"}, status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, task_id):
        try:
            task = LearningTask.objects.get(id=task_id)
            review = TaskReview.objects.get(task=task, user=request.user)

            serializer = TaskReviewSerializer(review, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
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

            if user in task.likes.all():
                task.likes.remove(user)
                action = "unliked"
            else:
                task.likes.add(user)
                action = "liked"

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
            return Response(
                {"error": "Unable to like or unlike."},
                status=status.HTTP_400_BAD_REQUEST,
            )
