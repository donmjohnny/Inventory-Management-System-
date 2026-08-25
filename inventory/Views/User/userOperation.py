"""
userOperation.py  -  business logic for login and the User master. Codes: US### / AU###

No request/response objects here -- pure functions returning the dctResult
envelope.
"""
from django.utils import timezone
from django.utils.translation import gettext as _

from inventory.Lib import clsResponse
from inventory.Model.User.userModel import TblUser


# --- authentication ---------------------------------------------------------
def fnAuthenticate(strUserName, strPassword):
    """
    Validate a username/password against tbl_user.
    On success dctData = {'objUser': <TblUser>}.

    The error message is deliberately generic (same text for unknown user and
    wrong password) so we don't reveal which usernames exist.
    """
    dctResult = clsResponse.fnNewResult()
    strUserName = (strUserName or '').strip()
    strPassword = strPassword or ''

    if not strUserName or not strPassword:
        clsResponse.fnAddError(dctResult, 'AU001',
                               _('User name and password are required.'))
        return dctResult

    objUser = TblUser.objects.filter(
        vhr_user_name__iexact=strUserName, sin_active=1).first()

    if objUser is None or not objUser.fnCheckPassword(strPassword):
        clsResponse.fnAddError(dctResult, 'AU002',
                               _('Invalid user name or password.'))
        return dctResult

    objUser.dat_last_login = timezone.now()
    objUser.save(update_fields=['dat_last_login'])

    return clsResponse.fnSuccess(dctResult, _('Login successful.'),
                                 {'objUser': objUser})


# --- User master CRUD -------------------------------------------------------
def fnValidate(dctInput, intUserId=0):
    dctResult = clsResponse.fnNewResult()

    strName = (dctInput.get('vhr_user_name') or '').strip()
    if not strName:
        clsResponse.fnAddError(dctResult, 'US001', _('User name is required.'))
    else:
        qs = TblUser.objects.filter(vhr_user_name__iexact=strName, sin_active=1)
        if intUserId:
            qs = qs.exclude(pk_user_id=intUserId)
        if qs.exists():
            clsResponse.fnAddError(dctResult, 'US002',
                                   _('User name %s already exists!') % strName)

    strPassword = dctInput.get('vhr_password') or ''
    if not intUserId and not strPassword:
        clsResponse.fnAddError(dctResult, 'US003',
                               _('Password is required for a new user.'))
    if strPassword and len(strPassword) < 6:
        clsResponse.fnAddError(dctResult, 'US004',
                               _('Password must be at least 6 characters.'))
    return dctResult


def fnSave(dctInput, intActorId=0):
    intUserId = int(dctInput.get('pk_user_id') or 0)
    dctResult = fnValidate(dctInput, intUserId)
    if clsResponse.fnHasError(dctResult):
        return dctResult

    if intUserId:
        objUser = TblUser.objects.get(pk_user_id=intUserId)
    else:
        objUser = TblUser()
        objUser.fk_created_by = intActorId

    objUser.vhr_user_name = (dctInput.get('vhr_user_name') or '').strip()
    objUser.vhr_display_name = (dctInput.get('vhr_display_name') or '').strip()
    objUser.sin_user_type = int(dctInput.get('sin_user_type') or 3)
    objUser.fk_modified_by = intActorId

    strPassword = dctInput.get('vhr_password') or ''
    if strPassword:                       # blank on edit keeps the existing hash
        objUser.fnSetPassword(strPassword)

    objUser.save()
    return clsResponse.fnSuccess(dctResult, _('User saved successfully.'),
                                 {'pk_user_id': objUser.pk_user_id})


def fnDelete(dctInput, intActorId=0):
    dctResult = clsResponse.fnNewResult()
    intUserId = int(dctInput.get('pk_user_id') or 0)
    if not intUserId:
        return clsResponse.fnAddError(dctResult, 'US005', _('No user specified.'))
    objUser = TblUser.objects.filter(pk_user_id=intUserId).first()
    if not objUser:
        return clsResponse.fnAddError(dctResult, 'US006', _('User not found.'))
    objUser.sin_active = 0                 # soft delete
    objUser.fk_modified_by = intActorId
    objUser.save()
    return clsResponse.fnSuccess(dctResult, _('User deleted.'))
