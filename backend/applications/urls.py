from django.urls import path

from .views import (
    approved_applications,
    create_application,
    csrf_token,
    login,
    logout,
    session,
)

app_name = 'applications'

urlpatterns = [
    path('csrf/', csrf_token, name='csrf-token'),
    path('auth/session/', session, name='session'),
    path('auth/login/', login, name='login'),
    path('auth/logout/', logout, name='logout'),
    path('approved-applications/', approved_applications, name='approved-applications'),
    path('applications/', create_application, name='create-application'),
]
