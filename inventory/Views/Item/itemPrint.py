"""
itemPrint.py  -  PDF / report generation for the Item master.

Stub showing where printable output goes (the third file in the per-entity
Views split). Build it out with ReportLab; it is called from itemViews when the
user requests a printable item list.
"""
from django.http import HttpResponse

from inventory.Lib import clsAuth
from inventory.Model.Item.itemModel import TbmItem


@clsAuth.fnLoginRequired
def itemListPdf(request):
    """
    TODO (intern): build a ReportLab PDF of the active item master.
    Pattern:
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas
        ... draw rows from TbmItem.objects.filter(sin_active=1) ...
        return HttpResponse(buffer, content_type='application/pdf')
    """
    intCount = TbmItem.objects.filter(sin_active=1).count()
    return HttpResponse(
        f'Item list PDF not yet implemented. Active items: {intCount}.',
        content_type='text/plain')
