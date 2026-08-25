"""
inventory/urls.py  -  all routes for the application.

Route names mirror the entity (item_page, item_list, item_save ...). When you
build a new module, copy the Item block and add a nav link in
templates/Common/base.html.
"""
from django.urls import path

from inventory.Views.User import userViews
from inventory.Views.Item import itemViews, itemPrint

urlpatterns = [
    # --- home ---------------------------------------------------------------
    path('', userViews.home, name='home'),

    # --- authentication (login against tbl_user) ----------------------------
    path('user/login/', userViews.loginPage, name='login'),
    path('user/logout/', userViews.logout, name='logout'),

    # --- User master --------------------------------------------------------
    path('user/', userViews.userPage, name='user_page'),
    path('user/list/', userViews.userList, name='user_list'),
    path('user/save/', userViews.userSave, name='user_save'),
    path('user/delete/', userViews.userDelete, name='user_delete'),

    # --- Item master (WORKED EXAMPLE - copy this pattern) -------------------
    path('item/', itemViews.itemPage, name='item_page'),
    path('item/list/', itemViews.itemList, name='item_list'),
    path('item/get/', itemViews.itemGet, name='item_get'),
    path('item/save/', itemViews.itemSave, name='item_save'),
    path('item/delete/', itemViews.itemDelete, name='item_delete'),
    path('item/print/', itemPrint.itemListPdf, name='item_print'),

    # =======================================================================
    # TODO (interns) - build these modules by copying the Item pattern.
    # See docs/TECHNICAL_DOCUMENT.docx for the detailed spec of each.
    #
    #   Masters:     Category, Unit, Location (Central/Branch), Supplier
    #   Purchase:    purchase entry at Central, auto Purchase Doc No, stock IN
    #   Requisition: branch raises request, auto Requisition Doc No
    #   Approval:    Stock Manager approves/rejects (with reason), stock checks
    #   StockMovement: generated on approval, linked to requisition
    #   BranchReceipt: branch confirms receipt, stock IN at branch, "Received"
    #   Stock:       current balance per item x location
    #   Reports:     registers + branch/item balances + pending/outstanding
    # =======================================================================
]
