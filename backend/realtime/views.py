from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from utils.notif import trigger_notification
from asgiref.sync import async_to_sync


class TestView(APIView):
    def get(self, request):
        try:
            async_to_sync(trigger_notification)(2, "Pain is pain", "success", True)
            return Response({"detail": "Notification sent."}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
