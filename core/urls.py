from django.contrib import admin
from django.urls import path, include
from finance.views import SecureTokenObtainPairView, SecureTokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('finance.urls')),

    path('api/token/', SecureTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', SecureTokenRefreshView.as_view(), name='token_refresh'),
]
