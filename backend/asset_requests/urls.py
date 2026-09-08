from django.urls import path

from .views import (
    ApprovedApplicationListCreateView,
    ApprovedApplicationDetailView,
    ApprovedApplicationCancelView,
    ApprovedApplicationRestoreView,
    LedgerListView, LedgerDetailView, LedgerSyncView, LedgerDownloadView,
    ExternalStorageRequestCreateView,
    LANRequestCreateView,
    PCRequestCreateView,
    SmartphoneRequestCreateView,
)


app_name = "asset_requests"

urlpatterns = [
    path("approved-applications/<int:pk>/", ApprovedApplicationDetailView.as_view(), name="approved-application-detail"),
    path("approved-applications/<int:pk>/cancel/", ApprovedApplicationCancelView.as_view(), name="approved-application-cancel"),
    path("approved-applications/<int:pk>/restore/", ApprovedApplicationRestoreView.as_view(), name="approved-application-restore"),
    path("ledgers/", LedgerListView.as_view(), name="ledger-list"),
    path("ledgers/<str:application_type>/", LedgerDetailView.as_view(), name="ledger-detail"),
    path("ledgers/<str:application_type>/sync/", LedgerSyncView.as_view(), name="ledger-sync"),
    path("ledgers/<str:application_type>/download/", LedgerDownloadView.as_view(), name="ledger-download"),
    path(
        "approved-applications/",
        ApprovedApplicationListCreateView.as_view(),
        name="approved-application-list-create",
    ),
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
