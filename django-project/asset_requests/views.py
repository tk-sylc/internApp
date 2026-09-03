from rest_framework import generics

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
        serializer.save(created_by=self.request.user)


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
