from django.urls import path

from .views import create_application, csrf_token

app_name = 'applications'

urlpatterns = [
    path('csrf/', csrf_token, name='csrf-token'),
    path('applications/', create_application, name='create-application'),
]
