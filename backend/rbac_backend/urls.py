"""rbac_backend URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/3.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
"""rbac_backend URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/3.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from rbac.views import (
    api_root,
    CategoryListView, CategoryAddView, CategoryUpdateView, CategoryDeleteView,
    ItemListView, ItemAddView, ItemUpdateView, ItemDeleteView,
    SupplierListView, SupplierAddView, SupplierUpdateView, SupplierDeleteView,
    BranchListView, BranchAddView, BranchUpdateView, BranchDeleteView,
    PurchaseListView, PurchaseDetailView, CentralStockListView, DashboardMetricsView,
    RequisitionListView, RequisitionDetailView, StockBalanceListView,
    BranchReceiptListView, BranchReceiptConfirmView
)

urlpatterns = [
    path('', api_root, name='api-root'),
    path('admin/', admin.site.urls),
    path('api/rbac/', include('rbac.urls')),
    
    # Category endpoints mapping to frontend
    path('api/categories/', CategoryListView.as_view(), name='category-list'),
    path('api/add-category/', CategoryAddView.as_view(), name='category-add'),
    path('api/update-category/<int:intPk>/', CategoryUpdateView.as_view(), name='category-update'),
    path('api/delete-category/<int:intPk>/', CategoryDeleteView.as_view(), name='category-delete'),
    
    # Item endpoints mapping to frontend
    path('api/items/', ItemListView.as_view(), name='item-list'),
    path('api/add-item/', ItemAddView.as_view(), name='item-add'),
    path('api/update-item/<str:strCode>/', ItemUpdateView.as_view(), name='item-update'),
    path('api/delete-item/<str:strCode>/', ItemDeleteView.as_view(), name='item-delete'),

    # Supplier endpoints mapping to frontend
    path('api/suppliers/', SupplierListView.as_view(), name='supplier-list'),
    path('api/add-supplier/', SupplierAddView.as_view(), name='supplier-add'),
    path('api/update-supplier/<int:intPk>/', SupplierUpdateView.as_view(), name='supplier-update'),
    path('api/delete-supplier/<int:intPk>/', SupplierDeleteView.as_view(), name='supplier-delete'),

    # Branch endpoints mapping to frontend
    path('api/branches/', BranchListView.as_view(), name='branch-list'),
    path('api/add-branch/', BranchAddView.as_view(), name='branch-add'),
    path('api/update-branch/<int:intPk>/', BranchUpdateView.as_view(), name='branch-update'),
    path('api/delete-branch/<int:intPk>/', BranchDeleteView.as_view(), name='branch-delete'),

    # Purchase endpoints mapping to frontend
    path('api/purchases/', PurchaseListView.as_view(), name='purchase-list'),
    path('api/purchases/<str:strPurchaseNo>/', PurchaseDetailView.as_view(), name='purchase-detail'),
    path('api/requisitions/', RequisitionListView.as_view(), name='requisition-list'),
    path('api/requisitions/<str:strRequisitionNo>/', RequisitionDetailView.as_view(), name='requisition-detail'),

    # Central Stock & Balance endpoints mapping to frontend
    path('api/central-stocks/', CentralStockListView.as_view(), name='central-stock-list'),
    path('api/stock-balance/', StockBalanceListView.as_view(), name='stock-balance-list'),

    # Branch Receipt endpoints
    path('api/receipts/', BranchReceiptListView.as_view(), name='branch-receipt-list'),
    path('api/receipts/<int:intPk>/confirm/', BranchReceiptConfirmView.as_view(), name='branch-receipt-confirm'),

    # Analytics endpoints
    path('api/analytics/dashboard/', DashboardMetricsView.as_view(), name='dashboard-metrics'),
]
