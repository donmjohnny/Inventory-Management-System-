"""
itemOperation.py  -  business logic for the Item master. Codes: IT###

This is the COPY-ME reference for every future master module (Category, Unit,
Location, Supplier, ...). It shows the standard shape: fnValidate -> fnSave ->
fnDelete, each returning the dctResult envelope, no request objects.
"""
from django.utils.translation import gettext as _

from inventory.Lib import clsResponse
from inventory.Model.Item.itemModel import TbmItem


def fnValidate(dctInput, intItemId=0):
    dctResult = clsResponse.fnNewResult()

    strCode = (dctInput.get('vhr_item_code') or '').strip()
    if not strCode:
        clsResponse.fnAddError(dctResult, 'IT001', _('Item code is required.'))
    else:
        qs = TbmItem.objects.filter(vhr_item_code__iexact=strCode, sin_active=1)
        if intItemId:
            qs = qs.exclude(pk_item_id=intItemId)
        if qs.exists():
            clsResponse.fnAddError(dctResult, 'IT002',
                                   _('Item code %s already exists!') % strCode)

    if not (dctInput.get('vhr_item_name') or '').strip():
        clsResponse.fnAddError(dctResult, 'IT003', _('Item name is required.'))

    # numeric guards
    for strKey, strCodeErr in (('dbl_reorder_level', 'IT004'),
                               ('dbl_standard_cost', 'IT005')):
        strVal = (dctInput.get(strKey) or '').strip()
        if strVal:
            try:
                if float(strVal) < 0:
                    clsResponse.fnAddError(dctResult, strCodeErr,
                                           _('%s cannot be negative.') % strKey)
            except ValueError:
                clsResponse.fnAddError(dctResult, strCodeErr,
                                       _('%s must be a number.') % strKey)
    return dctResult


def fnSave(dctInput, intActorId=0):
    intItemId = int(dctInput.get('pk_item_id') or 0)
    dctResult = fnValidate(dctInput, intItemId)
    if clsResponse.fnHasError(dctResult):
        return dctResult

    if intItemId:
        objItem = TbmItem.objects.get(pk_item_id=intItemId)
    else:
        objItem = TbmItem()
        objItem.fk_created_by = intActorId

    objItem.vhr_item_code = (dctInput.get('vhr_item_code') or '').strip()
    objItem.vhr_item_name = (dctInput.get('vhr_item_name') or '').strip()
    objItem.vhr_category = (dctInput.get('vhr_category') or '').strip()
    objItem.vhr_unit = (dctInput.get('vhr_unit') or '').strip()
    objItem.dbl_reorder_level = dctInput.get('dbl_reorder_level') or 0
    objItem.dbl_standard_cost = dctInput.get('dbl_standard_cost') or 0
    objItem.fk_modified_by = intActorId
    objItem.save()

    return clsResponse.fnSuccess(dctResult, _('Item saved successfully.'),
                                 {'pk_item_id': objItem.pk_item_id})


def fnDelete(dctInput, intActorId=0):
    dctResult = clsResponse.fnNewResult()
    intItemId = int(dctInput.get('pk_item_id') or 0)
    if not intItemId:
        return clsResponse.fnAddError(dctResult, 'IT006', _('No item specified.'))
    objItem = TbmItem.objects.filter(pk_item_id=intItemId).first()
    if not objItem:
        return clsResponse.fnAddError(dctResult, 'IT007', _('Item not found.'))
    objItem.sin_active = 0                 # soft delete
    objItem.fk_modified_by = intActorId
    objItem.save()
    return clsResponse.fnSuccess(dctResult, _('Item deleted.'))


def fnGet(intItemId):
    """Return a single item as a plain dict for the edit form."""
    dctResult = clsResponse.fnNewResult()
    objItem = TbmItem.objects.filter(pk_item_id=intItemId, sin_active=1).first()
    if not objItem:
        return clsResponse.fnAddError(dctResult, 'IT007', _('Item not found.'))
    return clsResponse.fnSuccess(dctResult, '', {
        'pk_item_id': objItem.pk_item_id,
        'vhr_item_code': objItem.vhr_item_code,
        'vhr_item_name': objItem.vhr_item_name,
        'vhr_category': objItem.vhr_category,
        'vhr_unit': objItem.vhr_unit,
        'dbl_reorder_level': str(objItem.dbl_reorder_level),
        'dbl_standard_cost': str(objItem.dbl_standard_cost),
    })
