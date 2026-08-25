"""
clsAuth.py  -  application authentication, backed entirely by tbl_user.

This project does NOT use django.contrib.auth for logging users in. A user is
authenticated against tbl_user and identified for the rest of the request via
the Django session:

    request.session['pk_user_id']     business user id (the "am I logged in" check)
    request.session['vhr_user_name']  for display
    request.session['sin_user_type']  1=Admin 2=Stock Manager 3=Branch User

Password hashing uses django.contrib.auth.hashers (make_password/check_password),
which are stand-alone PBKDF2 utilities and do not require Django's auth login.

Use this everywhere instead of django's @login_required / request.user:

    from inventory.Lib import clsAuth

    @clsAuth.fnLoginRequired
    def myView(request):
        intUserId = clsAuth.fnCurrentUserId(request)
        ...
"""
from functools import wraps

from django.http import JsonResponse
from django.shortcuts import redirect
from django.urls import reverse

SESSION_USER_ID = 'pk_user_id'
SESSION_USER_NAME = 'vhr_user_name'
SESSION_USER_TYPE = 'sin_user_type'


def fnSetSession(request, objUser):
    """Mark the session logged in for the given TblUser instance."""
    request.session[SESSION_USER_ID] = objUser.pk_user_id
    request.session[SESSION_USER_NAME] = objUser.vhr_display_name or objUser.vhr_user_name
    request.session[SESSION_USER_TYPE] = objUser.sin_user_type


def fnClearSession(request):
    """Log out: clear the whole session."""
    request.session.flush()


def fnCurrentUserId(request):
    """Business pk_user_id of the logged-in user, or 0 when anonymous."""
    return request.session.get(SESSION_USER_ID) or 0


def fnIsLoggedIn(request):
    return bool(request.session.get(SESSION_USER_ID))


def fnIsAjax(request):
    """jQuery sets this header automatically on $.ajax calls."""
    return request.headers.get('X-Requested-With') == 'XMLHttpRequest'


def fnLoginRequired(viewFunc):
    """
    Replacement for django.contrib.auth's @login_required.

    Anonymous browser request -> redirect to the login page (?next=<path>).
    Anonymous AJAX request     -> 401 JSON envelope so the front-end can react.
    """
    @wraps(viewFunc)
    def _wrapped(request, *args, **kwargs):
        if fnIsLoggedIn(request):
            return viewFunc(request, *args, **kwargs)
        if fnIsAjax(request):
            return JsonResponse(
                {'blnSuccess': False,
                 'strMessage': 'Session expired. Please log in again.',
                 'dctData': {},
                 'dctError': {'AUTH': ['Not authenticated.']}},
                status=401)
        strLogin = reverse('login')
        return redirect(f'{strLogin}?next={request.path}')
    return _wrapped


def fnUserContext(request):
    """
    Template context processor: exposes the logged-in user to every template as
    `dctSessionUser` (replaces django.contrib.auth's context processor).
    """
    return {'dctSessionUser': {
        'pk_user_id': request.session.get(SESSION_USER_ID) or 0,
        'vhr_user_name': request.session.get(SESSION_USER_NAME) or '',
        'sin_user_type': request.session.get(SESSION_USER_TYPE) or 0,
        'blnLoggedIn': bool(request.session.get(SESSION_USER_ID)),
    }}
