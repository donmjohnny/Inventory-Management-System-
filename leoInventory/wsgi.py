"""WSGI config for leoInventory."""
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'leoInventory.settings')
application = get_wsgi_application()
