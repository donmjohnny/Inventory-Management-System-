"""
Django settings for leoInventory (General Inventory Management System).

Django 3.2  |  PostgreSQL only  |  single app: 'inventory'

Conventions (see docs/TECHNICAL_DOCUMENT.docx):
  - One app: inventory
  - Per-entity layout: Model/<Entity>/<entity>Model.py,
    Views/<Entity>/<entity>Views.py + <entity>Operation.py + <entity>Print.py,
    templates/<Entity>/<entity>.html + <entity>.js
  - Tables: tbm_<name> (masters), tbl_<name> (transactions)
  - Columns: pk_/fk_/vhr_/sin_/dbl_/dat_/bln_ prefixes
  - Login is against tbl_user (NOT django.contrib.auth login / admin)
"""
import os
from pathlib import Path
from django.utils.translation import gettext_lazy as _

BASE_DIR = Path(__file__).resolve().parent.parent

DATA_UPLOAD_MAX_MEMORY_SIZE = 20971520

# --- SECURITY ---------------------------------------------------------------
# SECURITY WARNING: change this before any real deployment.
SECRET_KEY = 'dev-only-change-me-leoinventory-0123456789abcdef'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ['*']

# Wrap each HTTP request in a single DB transaction (company standard):
# commit on success, roll back automatically if the view raises.
ATOMIC_REQUESTS = True

# --- APPLICATIONS -----------------------------------------------------------
INSTALLED_APPS = [
    # Django admin / auth-login are intentionally NOT used. Login is handled by
    # the app against tbl_user (inventory/Lib/clsAuth.py).
    # 'django.contrib.auth' is kept ONLY for its password hashers
    # (make_password / check_password); its User model and login are unused.
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.staticfiles',
    # Project app ------------------------------------------------------------
    'inventory',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.middleware.gzip.GZipMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',   # session = login state
    'django.middleware.locale.LocaleMiddleware',              # enables _() translation
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'leoInventory.urls'
WSGI_APPLICATION = 'leoInventory.wsgi.application'

# --- TEMPLATES --------------------------------------------------------------
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        # shared Common/ templates folder; app's templates/<Entity>/ found via APP_DIRS
        'DIRS': [BASE_DIR / 'inventory' / 'templates' / 'Common'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                # our session user (replaces django.contrib.auth's context processor)
                'inventory.Lib.clsAuth.fnUserContext',
            ],
        },
    },
]

# --- DATABASE (PostgreSQL only) ---------------------------------------------
# Edit NAME / USER / PASSWORD / HOST / PORT to match your local PostgreSQL,
# then run:  python manage.py migrate
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'leo_inventory',
        'USER': 'postgres',
        'PASSWORD': 'mundackal@123',
        'HOST': '127.0.0.1',
        'PORT': '5432',
        'CONN_MAX_AGE': 60,
    },
}

# --- SESSION ----------------------------------------------------------------
SESSION_COOKIE_AGE = 120 * 60          # 2 hours
SESSION_EXPIRE_AT_BROWSER_CLOSE = True
SESSION_SAVE_EVERY_REQUEST = False

# --- AUTH / LOGIN -----------------------------------------------------------
# We use Django's PBKDF2 password hashers (defaults apply automatically) but
# not its login. Validation lives in our operation layer, so no validators.
LOGIN_URL = '/user/login/'   # used by inventory.Lib.clsAuth.fnLoginRequired

# --- I18N / L10N ------------------------------------------------------------
LANGUAGES = (
    ('en', _('English')),
    ('ar', _('Arabic')),
)
LANGUAGE_CODE = 'en-us'
LOCALE_PATHS = (BASE_DIR / 'locale',)
TIME_ZONE = 'Asia/Dubai'
USE_I18N = True
USE_L10N = True
USE_TZ = False

# --- STATIC -----------------------------------------------------------------
STATIC_URL = '/static/'
STATICFILES_DIRS = [BASE_DIR / 'inventory' / 'static']
STATIC_ROOT = BASE_DIR / 'static_collected'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# --- APPLICATION CONSTANTS --------------------------------------------------
# Status / type code dictionaries. Defined once here so screens, operations and
# reports all read the same source of truth (see Technical Document).

# User roles
USER_ROLE = {'ADMIN': 1, 'STOCK_MANAGER': 2, 'BRANCH_USER': 3}

# Location types
LOCATION_TYPE = {'CENTRAL': 1, 'BRANCH': 2}

# Stock movement direction (general ledger of stock)
MOVEMENT_TYPE = {'IN': 'IN', 'OUT': 'OUT', 'ADJ': 'ADJ'}

# Requisition document status
REQUISITION_STATUS = {
    'DRAFT':     1,
    'SUBMITTED': 2,
    'APPROVED':  3,
    'REJECTED':  4,
    'DISPATCHED': 5,
    'RECEIVED':  6,
}
