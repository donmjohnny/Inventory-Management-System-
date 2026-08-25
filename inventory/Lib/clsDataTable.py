"""
clsDataTable.py  -  server-side paginator for jQuery DataTables.

A list view passes a queryset and the list of field names to expose; this builds
the JSON structure DataTables expects (draw / recordsTotal / recordsFiltered /
data). Search is a simple case-insensitive OR across the given fields.

    return JsonResponse(fnPaginate(request, qry, ['pk_item_id', 'vhr_item_code',
                                                  'vhr_item_name']))
"""
from django.db.models import Q


def fnPaginate(request, qry, lstFields):
    intDraw = int(request.GET.get('draw', 1))
    intStart = int(request.GET.get('start', 0))
    intLength = int(request.GET.get('length', 25))
    strSearch = request.GET.get('search[value]', '').strip()

    intTotal = qry.count()

    if strSearch:
        objQ = Q()
        for strField in lstFields:
            objQ |= Q(**{f'{strField}__icontains': strSearch})
        qry = qry.filter(objQ)

    intFiltered = qry.count()
    qry = qry[intStart:intStart + intLength]

    lstData = []
    for objRow in qry:
        lstData.append({strField: getattr(objRow, strField, '') for strField in lstFields})

    return {
        'draw': intDraw,
        'recordsTotal': intTotal,
        'recordsFiltered': intFiltered,
        'data': lstData,
    }
