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


class PCRequestCreateView(generics.CreateAPIView):
    queryset = PCRequest.objects.all()
    serializer_class = PCRequestSerializer


class ExternalStorageRequestCreateView(generics.CreateAPIView):
    queryset = ExternalStorageRequest.objects.all()
    serializer_class = ExternalStorageRequestSerializer


class LANRequestCreateView(generics.CreateAPIView):
    queryset = LANRequest.objects.all()
    serializer_class = LANRequestSerializer


class SmartphoneRequestCreateView(generics.CreateAPIView):
    queryset = SmartphoneRequest.objects.all()
    serializer_class = SmartphoneRequestSerializer
