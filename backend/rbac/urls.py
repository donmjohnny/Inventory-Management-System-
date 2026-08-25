from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PermissionViewSet, RoleViewSet,
    StaticUserListView, StaticUserDetailView,
    LoginView, ForgotPasswordView, VerifyCodeView,
    CatalogItemListView, CatalogBranchListView,
    RequisitionListView, RequisitionDetailView,
    RequisitionNextNoView,
    RequisitionSubmitView, RequisitionApproveView, RequisitionRejectView,
    DispatchListView, DispatchDetailView,
)
# Section: Router Initialization
# objRouter is the DefaultRouter instance handling ViewSet URL routing automatically
objRouter = DefaultRouter()
objRouter.register(r'permissions', PermissionViewSet, basename='permission')
objRouter.register(r'roles', RoleViewSet, basename='role')

# Section: URL Patterns
# urlpatterns maps URLs to views and includes the router-generated ViewSet paths
urlpatterns = [
    path('', include(objRouter.urls)),
    path('users/', StaticUserListView.as_view(), name='static-user-list'),
    path('users/<int:intPk>/', StaticUserDetailView.as_view(), name='static-user-detail'),
    path('login/', LoginView.as_view(), name='login'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('verify-code/', VerifyCodeView.as_view(), name='verify-code'),
# Catalog endpoints for Requisition dropdowns
    path('catalog/items/', CatalogItemListView.as_view(), name='catalog-items'),
    path('catalog/branches/', CatalogBranchListView.as_view(), name='catalog-branches'),
    # Requisition endpoints
    path('requisitions/', RequisitionListView.as_view(), name='requisition-list'),
    path('requisitions/next-no/', RequisitionNextNoView.as_view(), name='requisition-next-no'),
    path('requisitions/<int:intPk>/submit/', RequisitionSubmitView.as_view(), name='requisition-submit'),
    path('requisitions/<int:intPk>/approve/', RequisitionApproveView.as_view(), name='requisition-approve'),
    path('requisitions/<int:intPk>/reject/', RequisitionRejectView.as_view(), name='requisition-reject'),
    path('requisitions/<int:intPk>/', RequisitionDetailView.as_view(), name='requisition-detail'),
    # Dispatch endpoints
    path('dispatches/', DispatchListView.as_view(), name='dispatch-list'),
    path('dispatches/<str:strGRNNo>/', DispatchDetailView.as_view(), name='dispatch-detail'),
]

