from django.urls import path

from .views import (
    ExternalStorageRequestCreateView,
    LANRequestCreateView,
    PCRequestCreateView,
    SmartphoneRequestCreateView,
)


app_name = "asset_requests"

urlpatterns = [
    path(
        "pc-requests/",
        PCRequestCreateView.as_view(),
        name="pc-request-create",
    ),
    path(
        "external-storage-requests/",
        ExternalStorageRequestCreateView.as_view(),
        name="external-storage-request-create",
    ),
    path(
        "lan-requests/",
        LANRequestCreateView.as_view(),
        name="lan-request-create",
    ),
    path(
        "smartphone-requests/",
        SmartphoneRequestCreateView.as_view(),
        name="smartphone-request-create",
    ),
]
