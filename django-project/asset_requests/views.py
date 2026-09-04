from rest_framework import generics, serializers

from accounts.models import UserProfile

from .models import (
    ExternalStorageRequest,
    LANRequest,
    PCRequest,
    SmartphoneRequest,
)
from .serializers import (
    ExternalStorageRequestSerializer,
    LANRequestSerializer,
    PCRequestSerializer,
    SmartphoneRequestSerializer,
)


class BaseAssetRequestCreateView(generics.CreateAPIView):
    def perform_create(self, serializer):
        try:
            profile = self.request.user.profile
        except UserProfile.DoesNotExist:
            raise serializers.ValidationError(
                {"profile": "申請前にプロフィールを登録してください。"}
            )

        serializer.save(
            created_by=self.request.user,
            requester_name=profile.display_name,
            department=profile.get_department_display(),
            requester_email=self.request.user.email,
        )


class PCRequestCreateView(BaseAssetRequestCreateView):
    queryset = PCRequest.objects.all()
    serializer_class = PCRequestSerializer


class ExternalStorageRequestCreateView(BaseAssetRequestCreateView):
    queryset = ExternalStorageRequest.objects.all()
    serializer_class = ExternalStorageRequestSerializer


class LANRequestCreateView(BaseAssetRequestCreateView):
    queryset = LANRequest.objects.all()
    serializer_class = LANRequestSerializer


class SmartphoneRequestCreateView(BaseAssetRequestCreateView):
    queryset = SmartphoneRequest.objects.all()
    serializer_class = SmartphoneRequestSerializer
