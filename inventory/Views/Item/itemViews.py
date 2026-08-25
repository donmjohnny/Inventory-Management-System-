"""
itemViews.py  -  HTTP layer for the Item master (the worked example).

Thin: each view guards with @clsAuth.fnLoginRequired, parses input, calls
itemOperation, returns JsonResponse. Copy this file when building new modules.
"""
import json

from django.http import JsonResponse
from django.shortcuts import render

from inventory.Lib import clsAuth
from inventory.Lib.clsDataTable import fnPaginate
from inventory.Model.Item.itemModel import TbmItem
from inventory.Views.Item import itemOperation as op


@clsAuth.fnLoginRequired
def itemPage(request):
    return render(request, 'Item/item.html', {'strTitle': 'Items'})


@clsAuth.fnLoginRequired
def itemList(request):
    qry = TbmItem.objects.filter(sin_active=1).order_by('vhr_item_code')
    return JsonResponse(fnPaginate(request, qry, [
        'pk_item_id', 'vhr_item_code', 'vhr_item_name',
        'vhr_category', 'vhr_unit', 'dbl_reorder_level', 'dbl_standard_cost']))


@clsAuth.fnLoginRequired
def itemGet(request):
    intItemId = int(request.GET.get('pk_item_id') or 0)
    return JsonResponse(op.fnGet(intItemId))


@clsAuth.fnLoginRequired
def itemSave(request):
    dctInput = {k: request.POST.get(k, '') for k in (
        'pk_item_id', 'vhr_item_code', 'vhr_item_name', 'vhr_category',
        'vhr_unit', 'dbl_reorder_level', 'dbl_standard_cost')}
    return JsonResponse(op.fnSave(dctInput, clsAuth.fnCurrentUserId(request)))


@clsAuth.fnLoginRequired
def itemDelete(request):
    dctInput = json.loads(request.body or '{}')
    return JsonResponse(op.fnDelete(dctInput, clsAuth.fnCurrentUserId(request)))
