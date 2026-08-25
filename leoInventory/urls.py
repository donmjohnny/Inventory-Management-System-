"""
Root URL configuration for leoInventory.

The single app 'inventory' owns all routes. There is intentionally no Django
admin site and no django.contrib.auth login; authentication is handled by the
app against tbl_user (see inventory/Lib/clsAuth.py).
"""
from django.urls import path, include

urlpatterns = [
    path('', include('inventory.urls')),
]
