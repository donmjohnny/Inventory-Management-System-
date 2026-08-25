"""ASGI config for leoInventory."""
import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'leoInventory.settings')
application = get_asgi_application()
