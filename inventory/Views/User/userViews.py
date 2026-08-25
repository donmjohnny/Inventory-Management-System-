"""
userViews.py  -  HTTP layer for login/logout and the User master screen.

Thin: parse the request, call userOperation, return a response. No business
logic here.
"""
import json

from django.http import JsonResponse
from django.shortcuts import redirect, render
from django.views.decorators.http import require_http_methods

from inventory.Lib import clsAuth
from inventory.Lib.clsDataTable import fnPaginate
from inventory.Model.User.userModel import TblUser
from inventory.Views.User import userOperation as op


# --- home -------------------------------------------------------------------
@clsAuth.fnLoginRequired
def home(request):
    return render(request, 'Common/home.html', {'strTitle': 'leoInventory'})


# --- authentication ---------------------------------------------------------
@require_http_methods(['GET', 'POST'])
def loginPage(request):
    if clsAuth.fnIsLoggedIn(request):
        return redirect('home')

    strNext = request.GET.get('next') or request.POST.get('next') or ''

    if request.method == 'POST':
        dctResult = op.fnAuthenticate(
            request.POST.get('vhr_user_name', ''),
            request.POST.get('vhr_password', ''))
        if dctResult['blnSuccess']:
            clsAuth.fnSetSession(request, dctResult['dctData']['objUser'])
            return redirect(strNext or 'home')
        return render(request, 'User/login.html', {
            'strTitle': 'Sign in',
            'strError': dctResult['strMessage'] or 'Invalid user name or password.',
            'strUserName': request.POST.get('vhr_user_name', ''),
            'strNext': strNext,
        })

    return render(request, 'User/login.html', {'strTitle': 'Sign in', 'strNext': strNext})


def logout(request):
    clsAuth.fnClearSession(request)
    return redirect('login')


# --- User master ------------------------------------------------------------
@clsAuth.fnLoginRequired
def userPage(request):
    return render(request, 'User/user.html', {'strTitle': 'Users'})


@clsAuth.fnLoginRequired
def userList(request):
    qry = TblUser.objects.filter(sin_active=1).order_by('vhr_user_name')
    return JsonResponse(fnPaginate(request, qry, [
        'pk_user_id', 'vhr_user_name', 'vhr_display_name', 'sin_user_type']))


@clsAuth.fnLoginRequired
def userSave(request):
    dctInput = {k: request.POST.get(k, '') for k in (
        'pk_user_id', 'vhr_user_name', 'vhr_display_name',
        'sin_user_type', 'vhr_password')}
    return JsonResponse(op.fnSave(dctInput, clsAuth.fnCurrentUserId(request)))


@clsAuth.fnLoginRequired
def userDelete(request):
    dctInput = json.loads(request.body or '{}')
    return JsonResponse(op.fnDelete(dctInput, clsAuth.fnCurrentUserId(request)))
