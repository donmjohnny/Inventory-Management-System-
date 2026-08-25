from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.http import JsonResponse
from django.db import transaction
from django.db.models import Q
from django.contrib.auth.hashers import make_password, check_password
from .serializers import (
    PermissionSerializer, RoleSerializer, StaticUserSerializer, CategorySerializer,
    ItemSerializer, SupplierSerializer, BranchSerializer, CentralStockSerializer,
    PurchaseSerializer, RequisitionSerializer, StockMovementSerializer
)
from .models import (
    Permission, Role, UserProfile, Category, Item, Supplier, SupplierItem,
    Branch, CentralStock, Purchase, PurchaseItem, Requisition, RequisitionItem,
    StockMovement, StockBalance
)

# Section: Permission ViewSet
# Read-only API to list or retrieve Permission objects.
class PermissionViewSet(viewsets.ReadOnlyModelViewSet):
    # queryset is a list of Permission objects ordered by id
    queryset = Permission.objects.all().order_by('id')
    # serializer_class specifies which serializer to use
    serializer_class = PermissionSerializer


# Section: Role ViewSet
# CRUD API to list, create, update, or delete Role objects.
class RoleViewSet(viewsets.ModelViewSet):
    # queryset is a list of Role objects ordered by id
    queryset = Role.objects.all().order_by('id')
    # serializer_class specifies which serializer to use
    serializer_class = RoleSerializer


# Section: Static User List View
# API View to list all users or create a new user.
class StaticUserListView(APIView):
    def get(self, objRequest):
        # listUsers is a queryset list of all UserProfile objects ordered by id
        listUsers = UserProfile.objects.all().order_by('id')
        # objSerializer converts listUsers into JSON format
        objSerializer = StaticUserSerializer(listUsers, many=True)
        return Response(objSerializer.data)

    def post(self, objRequest):
        # strName is the string full name of the user from the POST request (supports both prefixed and legacy keys)
        strName = objRequest.data.get('strName') or objRequest.data.get('name')
        if not strName:
            # Fallback to concatenate string first and last name if name is not provided
            strFirstName = objRequest.data.get('strFirstName') or objRequest.data.get('firstName', '')
            strLastName = objRequest.data.get('strLastName') or objRequest.data.get('lastName', '')
            strName = f"{strFirstName} {strLastName}".strip()

        # strUsername is the string username from request data
        strUsername = objRequest.data.get('strUsername') or objRequest.data.get('username')
        # strEmail is the string email from request data
        strEmail = objRequest.data.get('strEmail') or objRequest.data.get('email')
        # strRoleVal is the string role identifier from request data
        strRoleVal = objRequest.data.get('strRoleName') or objRequest.data.get('role_name') or objRequest.data.get('role', 'user')

        # objDbRole is the Role object fetched matching the requested role value
        objDbRole = Role.objects.filter(strName__iexact=strRoleVal).first()
        if not objDbRole:
            # dictRoleMap maps simple role strings to standard database role name strings
            dictRoleMap = {
                'admin': 'Admin',
                'manager': 'Stock Manager',
                'stockmanager': 'Stock Manager',
                'stock manager': 'Stock Manager',
                'stock manager(branch)': 'Stock Manager',
                'stock manager (branch)': 'Stock Manager',
                'user': 'Branch User',
                'branchuser': 'Branch User',
                'branch user': 'Branch User'
            }
            mapped_role_name = dictRoleMap.get(strRoleVal.lower(), 'Branch User')
            objDbRole = Role.objects.filter(strName__iexact=mapped_role_name).first()
            if objDbRole:
                strRoleName = objDbRole.strName
            else:
                strRoleName = mapped_role_name
        else:
            strRoleName = objDbRole.strName

        # Branch lookup
        strBranchName = objRequest.data.get('strBranch') or objRequest.data.get('branch')
        intBranchId = objRequest.data.get('intBranchId') or objRequest.data.get('branch_id')

        objBranch = None
        if intBranchId:
            objBranch = Branch.objects.filter(id=intBranchId).first()
        if not objBranch and strBranchName:
            objBranch = Branch.objects.filter(strName__iexact=strBranchName).first() or Branch.objects.filter(strCode__iexact=strBranchName).first()

        # Check if the username string is already taken
        if UserProfile.objects.filter(strUsername=strUsername).exists():
            return Response({"error": f"Username '{strUsername}' is already taken"}, status=status.HTTP_400_BAD_REQUEST)
        # Check if the email string is already registered
        if UserProfile.objects.filter(strEmail=strEmail).exists():
            return Response({"error": f"Email '{strEmail}' is already registered"}, status=status.HTTP_400_BAD_REQUEST)

        # Password handling
        strPlainPassword = objRequest.data.get('strPassword') or objRequest.data.get('password') or 'password123'
        strHashedPassword = make_password(strPlainPassword)

        # objUser is the new UserProfile database object created
        objUser = UserProfile.objects.create(
            strName=strName,
            strUsername=strUsername,
            strEmail=strEmail,
            strRoleName=strRoleName,
            strStatus="Active",
            strAvatar=f"https://api.dicebear.com/7.x/adventurer/svg?seed={strUsername}",
            strPassword=strHashedPassword,
            objBranch=objBranch,
        )
        
        # objSerializer converts the new user object to JSON response data
        objSerializer = StaticUserSerializer(objUser)
        return Response(objSerializer.data, status=status.HTTP_201_CREATED)


# Section: Static User Detail View
# API View to retrieve, update, or delete a single user by primary key (intPk).
class StaticUserDetailView(APIView):
    def get(self, objRequest, intPk):
        try:
            # objUser is the single UserProfile database object matching the integer primary key
            objUser = UserProfile.objects.get(id=intPk)
        except UserProfile.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # objSerializer converts the user profile to JSON
        objSerializer = StaticUserSerializer(objUser)
        return Response(objSerializer.data)

    def patch(self, objRequest, intPk):
        try:
            # objUser is the single UserProfile database object to edit
            objUser = UserProfile.objects.get(id=intPk)
        except UserProfile.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Extract new values from request data (supporting both prefixed and legacy keys)
        strRoleName = objRequest.data.get('strRoleName') or objRequest.data.get('role_name')
        strUserStatus = objRequest.data.get('strStatus') or objRequest.data.get('status')
        strName = objRequest.data.get('strName') or objRequest.data.get('name')
        strUsername = objRequest.data.get('strUsername') or objRequest.data.get('username')
        strEmail = objRequest.data.get('strEmail') or objRequest.data.get('email')
        strPassword = objRequest.data.get('strPassword') or objRequest.data.get('password')

        # Update password if provided
        if strPassword is not None and strPassword.strip() != "":
            objUser.strPassword = make_password(strPassword.strip())

        # Update name string if provided
        if strName is not None:
            objUser.strName = strName

        # Update username string if provided and unique
        if strUsername is not None:
            if strUsername != objUser.strUsername and UserProfile.objects.filter(strUsername=strUsername).exists():
                return Response({"error": f"Username '{strUsername}' is already taken"}, status=status.HTTP_400_BAD_REQUEST)
            objUser.strUsername = strUsername

        # Update email string if provided and unique
        if strEmail is not None:
            if strEmail != objUser.strEmail and UserProfile.objects.filter(strEmail=strEmail).exists():
                return Response({"error": f"Email '{strEmail}' is already registered"}, status=status.HTTP_400_BAD_REQUEST)
            objUser.strEmail = strEmail

        # Update user's role name if the new role exists
        if strRoleName is not None:
            objDbRole = Role.objects.filter(strName__iexact=strRoleName).first()
            if not objDbRole:
                dictRoleMap = {
                    'admin': 'Admin',
                    'manager': 'Stock Manager',
                    'stockmanager': 'Stock Manager',
                    'stock manager': 'Stock Manager',
                    'stock manager(branch)': 'Stock Manager',
                    'stock manager (branch)': 'Stock Manager',
                    'user': 'Branch User',
                    'branchuser': 'Branch User',
                    'branch user': 'Branch User'
                }
                mapped_role_name = dictRoleMap.get(strRoleName.lower())
                if mapped_role_name:
                    objDbRole = Role.objects.filter(strName__iexact=mapped_role_name).first()
            
            if not objDbRole:
                return Response(
                    {"error": f"Role '{strRoleName}' does not exist in the database. Please create the role first."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            objUser.strRoleName = objDbRole.strName

        # Update status string if valid ('Active' or 'Inactive')
        if strUserStatus is not None:
            if strUserStatus not in ['Active', 'Inactive']:
                return Response(
                    {"error": "Status must be 'Active' or 'Inactive'"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            objUser.strStatus = strUserStatus

        # Update branch if provided
        strBranchName = objRequest.data.get('strBranch') if 'strBranch' in objRequest.data else (objRequest.data.get('branch') if 'branch' in objRequest.data else None)
        intBranchId = objRequest.data.get('intBranchId') if 'intBranchId' in objRequest.data else (objRequest.data.get('branch_id') if 'branch_id' in objRequest.data else None)

        if strBranchName is not None or intBranchId is not None:
            objBranch = None
            if intBranchId:
                objBranch = Branch.objects.filter(id=intBranchId).first()
            if not objBranch and strBranchName:
                objBranch = Branch.objects.filter(strName__iexact=strBranchName).first() or Branch.objects.filter(strCode__iexact=strBranchName).first()
            objUser.objBranch = objBranch

        # Save modifications to database
        objUser.save()
        # objSerializer converts updated object to JSON
        objSerializer = StaticUserSerializer(objUser)
        return Response(objSerializer.data)

    def delete(self, objRequest, intPk):
        try:
            # objUser is the single UserProfile database object to delete
            objUser = UserProfile.objects.get(id=intPk)
        except UserProfile.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Delete user profile record
        objUser.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# Section: Login API View
# Handles user authentication checking username/email and encrypted passwords.
class LoginView(APIView):
    def post(self, objRequest):
        strUsername = objRequest.data.get('username', '').strip().lower()
        strPassword = objRequest.data.get('password', '').strip()

        if not strUsername or not strPassword:
            return Response({"error": "Please enter both username/email and password."}, status=status.HTTP_400_BAD_REQUEST)

        objUser = UserProfile.objects.filter(
            Q(strUsername__iexact=strUsername) | Q(strEmail__iexact=strUsername)
        ).first()

        if not objUser:
            return Response({"error": "Invalid username or email address."}, status=status.HTTP_400_BAD_REQUEST)

        if objUser.strStatus == 'Inactive':
            return Response({"error": "Your account has been deactivated. Contact Admin."}, status=status.HTTP_400_BAD_REQUEST)

        if not check_password(strPassword, objUser.strPassword):
            return Response({"error": "Incorrect password. Please try again."}, status=status.HTTP_400_BAD_REQUEST)

        objSerializer = StaticUserSerializer(objUser)
        return Response(objSerializer.data, status=status.HTTP_200_OK)


# Global dictionary to store temporary verification codes (user_id -> intCode)
dictResetCodes = {}

# Section: Forgot Password API View
# Simulates checking user database for password recovery details.
class ForgotPasswordView(APIView):
    def post(self, objRequest):
        strForgotInput = objRequest.data.get('email', '').strip().lower()

        if not strForgotInput:
            return Response({"error": "Please enter your username or email address."}, status=status.HTTP_400_BAD_REQUEST)

        objUser = UserProfile.objects.filter(
            Q(strUsername__iexact=strForgotInput) | Q(strEmail__iexact=strForgotInput)
        ).first()

        if not objUser:
            return Response({"error": "User with this username or email does not exist."}, status=status.HTTP_400_BAD_REQUEST)

        import random
        from django.core.mail import send_mail
        from django.conf import settings

        intCode = random.randint(100000, 999999)
        
        # Save verification code to in-memory store
        dictResetCodes[objUser.id] = intCode

        strEmailSubject = "[Action Required] Verify your LeoInventory password reset"
        strEmailBody = (
            f"Hello {objUser.strName or objUser.strUsername},\n\n"
            f"We received a request to reset the password for your LeoInventory Enterprise account.\n\n"
            f"Please verify your identity by entering the following 6-digit verification code on your screen:\n"
            f"👉 {intCode}\n\n"
            f"If you did not request this, please ignore this email.\n\n"
            f"Regards,\n"
            f"LeoInventory Security Team"
        )
        
        boolMailSent = False
        try:
            if settings.EMAIL_HOST_USER:
                send_mail(
                    strEmailSubject,
                    strEmailBody,
                    settings.EMAIL_HOST_USER,
                    [objUser.strEmail],
                    fail_silently=False,
                )
                boolMailSent = True
        except Exception as objErr:
            print(f"SMTP Email transmission failed: {str(objErr)}")

        return Response({
            "message": "User validation successful",
            "id": objUser.id,
            "email": objUser.strEmail,
            "username": objUser.strUsername,
            "code": None if boolMailSent else intCode,  # Only expose code to frontend if mail was not sent
            "mail_sent": boolMailSent
        }, status=status.HTTP_200_OK)


# Section: Verify Code API View
# Validates the 6-digit code inputted by the user
class VerifyCodeView(APIView):
    def post(self, objRequest):
        intUserId = objRequest.data.get('id')
        strCode = str(objRequest.data.get('code', '')).strip()

        if not intUserId or not strCode:
            return Response({"error": "Missing user ID or verification code."}, status=status.HTTP_400_BAD_REQUEST)

        intStoredCode = dictResetCodes.get(intUserId)
        if intStoredCode is None:
            return Response({"error": "No password reset request found for this user."}, status=status.HTTP_400_BAD_REQUEST)

        if str(intStoredCode) == strCode:
            # Code matched. Clear code from temporary dictionary to prevent re-use
            del dictResetCodes[intUserId]
            return Response({"message": "Code verified successfully."}, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Invalid verification code. Please check your email and try again."}, status=status.HTTP_400_BAD_REQUEST)


# Section: API Root View
# Renders a welcome JSON message with lists of endpoints.
def api_root(objRequest):
    return JsonResponse({
        "message": "Welcome to the StockFlow RBAC API Backend",
        "endpoints": {
            "permissions": "/api/rbac/permissions/",
            "roles": "/api/rbac/roles/",
            "static_users": "/api/rbac/users/",
            "categories": "/api/categories/",
            "items": "/api/items/",
            "suppliers": "/api/suppliers/",
            "branches": "/api/branches/",
        }
    })


# Section: Category Views
# API Views for Category CRUD operations mapping to frontend calls.
class CategoryListView(APIView):
    def get(self, objRequest):
        categories = Category.objects.all().order_by('id')
        serializer = CategorySerializer(categories, many=True)
        return Response(serializer.data)

class CategoryAddView(APIView):
    def post(self, objRequest):
        serializer = CategorySerializer(data=objRequest.data)
        if serializer.is_valid():
            # Associate with a default user if available
            admin_user = UserProfile.objects.filter(strRoleName='Admin').first()
            serializer.save(objCreatedBy=admin_user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class CategoryUpdateView(APIView):
    def post(self, objRequest, intPk):
        try:
            category = Category.objects.get(id=intPk)
        except Category.DoesNotExist:
            return Response({"error": "Category not found"}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = CategorySerializer(category, data=objRequest.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class CategoryDeleteView(APIView):
    def delete(self, objRequest, intPk):
        try:
            category = Category.objects.get(id=intPk)
        except Category.DoesNotExist:
            return Response({"error": "Category not found"}, status=status.HTTP_404_NOT_FOUND)
        
        category.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# Section: Item Views
# API Views for Item CRUD operations mapping to frontend calls.
class ItemListView(APIView):
    def get(self, objRequest):
        items = Item.objects.all().order_by('id')
        serializer = ItemSerializer(items, many=True)
        return Response(serializer.data)

class ItemAddView(APIView):
    def post(self, objRequest):
        serializer = ItemSerializer(data=objRequest.data)
        if serializer.is_valid():
            admin_user = UserProfile.objects.filter(strRoleName='Admin').first()
            serializer.save(objCreatedBy=admin_user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ItemUpdateView(APIView):
    def post(self, objRequest, strCode):
        try:
            item = Item.objects.get(strCode=strCode)
        except Item.DoesNotExist:
            return Response({"error": "Item not found"}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = ItemSerializer(item, data=objRequest.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ItemDeleteView(APIView):
    def delete(self, objRequest, strCode):
        try:
            item = Item.objects.get(strCode=strCode)
        except Item.DoesNotExist:
            return Response({"error": "Item not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Soft delete by setting status to Inactive
        item.strStatus = 'Inactive'
        item.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


# Section: Supplier Views
# API Views for Supplier CRUD operations.
class SupplierListView(APIView):
    def get(self, objRequest):
        suppliers = Supplier.objects.all().order_by('id')
        serializer = SupplierSerializer(suppliers, many=True)
        return Response(serializer.data)

class SupplierAddView(APIView):
    def post(self, objRequest):
        serializer = SupplierSerializer(data=objRequest.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class SupplierUpdateView(APIView):
    def post(self, objRequest, intPk):
        try:
            supplier = Supplier.objects.get(id=intPk)
        except Supplier.DoesNotExist:
            return Response({"error": "Supplier not found"}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = SupplierSerializer(supplier, data=objRequest.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class SupplierDeleteView(APIView):
    def delete(self, objRequest, intPk):
        try:
            supplier = Supplier.objects.get(id=intPk)
        except Supplier.DoesNotExist:
            return Response({"error": "Supplier not found"}, status=status.HTTP_404_NOT_FOUND)
        
        supplier.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# Section: Branch Views
# API Views for Branch CRUD operations.
class BranchListView(APIView):
    def get(self, objRequest):
        branches = Branch.objects.all().order_by('id')
        serializer = BranchSerializer(branches, many=True)
        return Response(serializer.data)

class BranchAddView(APIView):
    def post(self, objRequest):
        serializer = BranchSerializer(data=objRequest.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class BranchUpdateView(APIView):
    def post(self, objRequest, intPk):
        try:
            branch = Branch.objects.get(id=intPk)
        except Branch.DoesNotExist:
            return Response({"error": "Branch not found"}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = BranchSerializer(branch, data=objRequest.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class BranchDeleteView(APIView):
    def delete(self, objRequest, intPk):
        try:
            branch = Branch.objects.get(id=intPk)
        except Branch.DoesNotExist:
            return Response({"error": "Branch not found"}, status=status.HTTP_404_NOT_FOUND)
        
        branch.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# Section: Purchase Views
# Handle listing and creating purchase invoices in the database
class PurchaseListView(APIView):
    def get(self, objRequest):
        purchases = Purchase.objects.all().order_by('-dtCreatedAt')
        serializer = PurchaseSerializer(purchases, many=True)
        return Response(serializer.data)

    def post(self, objRequest):
        with transaction.atomic():
            serializer = PurchaseSerializer(data=objRequest.data)
            if serializer.is_valid():
                purchase = serializer.save()
                
                # Update stock if posted directly
                if purchase.strStatus == 'Posted':
                    for pi in purchase.items.all():
                        item = Item.objects.filter(strCode=pi.strCode).first()
                        if not item:
                            category_name = pi.strCategory or "Office Supplies"
                            category, _ = Category.objects.get_or_create(strName=category_name)
                            admin_user = UserProfile.objects.filter(strRoleName='Admin').first()
                            item = Item.objects.create(
                                strCode=pi.strCode,
                                strName=pi.strName,
                                objCategory=category,
                                strUnit=pi.strUnit or "Box",
                                floaPrice=pi.floaPrice,
                                intCurrentStock=0,
                                strColor=pi.strColor or "#e0e7ff",
                                strTextColor=pi.strTextColor or "#4f46e5",
                                strIcon=pi.strIcon or "file-text",
                                objCreatedBy=admin_user
                            )
                        cs, _ = CentralStock.objects.get_or_create(objItem=item)
                        cs.intCurrentStock += pi.intQty
                        cs.save()
                        item.intCurrentStock = cs.intCurrentStock
                        item.save(update_fields=['intCurrentStock'])
                        
                        # Update StockBalance for Central Office
                        sb, _ = StockBalance.objects.get_or_create(objItem=item, strLocation='Central Office')
                        sb.intQuantity = cs.intCurrentStock
                        sb.save()
                            
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Handle retrieving and updating specific purchase invoices
class PurchaseDetailView(APIView):
    def get(self, objRequest, strPurchaseNo):
        try:
            purchase = Purchase.objects.get(strPurchaseNo=strPurchaseNo)
        except Purchase.DoesNotExist:
            return Response({"error": "Purchase not found"}, status=status.HTTP_404_NOT_FOUND)
        serializer = PurchaseSerializer(purchase)
        return Response(serializer.data)

    def post(self, objRequest, strPurchaseNo):
        try:
            purchase = Purchase.objects.get(strPurchaseNo=strPurchaseNo)
        except Purchase.DoesNotExist:
            return Response({"error": "Purchase not found"}, status=status.HTTP_404_NOT_FOUND)

        old_status = purchase.strStatus
        new_status = objRequest.data.get('strStatus', old_status)

        with transaction.atomic():
            serializer = PurchaseSerializer(purchase, data=objRequest.data, partial=True)
            if serializer.is_valid():
                updated_purchase = serializer.save()
                
                # Manage stock adjustment on transitions
                if old_status == 'Draft' and new_status == 'Posted':
                    for pi in updated_purchase.items.all():
                        item = Item.objects.filter(strCode=pi.strCode).first()
                        if not item:
                            category_name = pi.strCategory or "Office Supplies"
                            category, _ = Category.objects.get_or_create(strName=category_name)
                            admin_user = UserProfile.objects.filter(strRoleName='Admin').first()
                            item = Item.objects.create(
                                strCode=pi.strCode,
                                strName=pi.strName,
                                objCategory=category,
                                strUnit=pi.strUnit or "Box",
                                floaPrice=pi.floaPrice,
                                intCurrentStock=0,
                                strColor=pi.strColor or "#e0e7ff",
                                strTextColor=pi.strTextColor or "#4f46e5",
                                strIcon=pi.strIcon or "file-text",
                                objCreatedBy=admin_user
                            )
                        cs, _ = CentralStock.objects.get_or_create(objItem=item)
                        cs.intCurrentStock += pi.intQty
                        cs.save()
                        item.intCurrentStock = cs.intCurrentStock
                        item.save(update_fields=['intCurrentStock'])
                        
                        # Update StockBalance for Central Office
                        sb, _ = StockBalance.objects.get_or_create(objItem=item, strLocation='Central Office')
                        sb.intQuantity = cs.intCurrentStock
                        sb.save()
                elif old_status == 'Posted' and new_status == 'Reversed':
                    for pi in updated_purchase.items.all():
                        item = Item.objects.filter(strCode=pi.strCode).first()
                        if item:
                            cs, _ = CentralStock.objects.get_or_create(objItem=item)
                            cs.intCurrentStock = max(0, cs.intCurrentStock - pi.intQty)
                            cs.save()
                            item.intCurrentStock = cs.intCurrentStock
                            item.save(update_fields=['intCurrentStock'])
                            
                            # Update StockBalance for Central Office
                            sb, _ = StockBalance.objects.get_or_create(objItem=item, strLocation='Central Office')
                            sb.intQuantity = cs.intCurrentStock
                            sb.save()
                            
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, objRequest, strPurchaseNo):
        try:
            purchase = Purchase.objects.get(strPurchaseNo=strPurchaseNo)
        except Purchase.DoesNotExist:
            return Response({"error": "Purchase not found"}, status=status.HTTP_404_NOT_FOUND)
        purchase.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)



# Section: Central Stock Views
# Retrieve current stock counts from the CentralStock table
class CentralStockListView(APIView):
    def get(self, objRequest):
        stocks = CentralStock.objects.all().order_by('objItem__strName')
        serializer = CentralStockSerializer(stocks, many=True)
        return Response(serializer.data)


# Section: Catalog Item List View
# Returns all active items for the requisition item search dropdown.
class CatalogItemListView(APIView):
    def get(self, objRequest):
        items = Item.objects.filter(strStatus='Active').order_by('strName')
        serializer = ItemSerializer(items, many=True)
        return Response(serializer.data)


# Section: Catalog Branch List View
# Returns all branches for the requisition branch dropdown.
class CatalogBranchListView(APIView):
    def get(self, objRequest):
        branches = Branch.objects.all().order_by('strName')
        serializer = BranchSerializer(branches, many=True)
        return Response(serializer.data)


# Section: Requisition Next Number View
class RequisitionNextNoView(APIView):
    def get(self, objRequest):
        import re
        from django.utils import timezone
        year = timezone.now().year
        max_num = 0
        for r in Requisition.objects.filter(strRequisitionNo__startswith=f'REQ-{year}-'):
            match = re.match(rf'^REQ-{year}-(\d+)$', r.strRequisitionNo)
            if match:
                val = int(match.group(1))
                if val > max_num:
                    max_num = val
        return Response({'strRequisitionNo': f'REQ-{year}-{max_num + 1:04d}'})


# Section: Requisition List View
class RequisitionListView(APIView):
    def get(self, objRequest):
        str_status = objRequest.query_params.get('status')
        int_user_id = objRequest.query_params.get('user_id')
        qs = Requisition.objects.all().order_by('-dtCreatedAt')
        if str_status:
            qs = qs.filter(strStatus=str_status)
        if int_user_id:
            qs = qs.filter(objCreatedBy__id=int_user_id)
        serializer = RequisitionSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, objRequest):
        serializer = RequisitionSerializer(data=objRequest.data)
        if serializer.is_valid():
            obj_req = serializer.save()
            return Response(RequisitionSerializer(obj_req).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    def post(self, objRequest):
        serializer = RequisitionSerializer(data=objRequest.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# Section: Requisition Detail View
class RequisitionDetailView(APIView):
    def get(self, objRequest, intPk=None, strRequisitionNo=None):
        try:
            if intPk is not None:
                obj_req = Requisition.objects.get(id=intPk)
            else:
                obj_req = Requisition.objects.get(strRequisitionNo=strRequisitionNo)
        except Requisition.DoesNotExist:
            return Response({'error': 'Requisition not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(RequisitionSerializer(obj_req).data)

    def patch(self, objRequest, intPk=None, strRequisitionNo=None):
        try:
            if intPk is not None:
                obj_req = Requisition.objects.get(id=intPk)
            else:
                obj_req = Requisition.objects.get(strRequisitionNo=strRequisitionNo)
        except Requisition.DoesNotExist:
            return Response({'error': 'Requisition not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if we are updating status to Approved or Rejected to run business logic
        strNewStatus = objRequest.data.get('strStatus')
        if strNewStatus in ['Approved', 'Rejected']:
            if obj_req.strStatus != 'Pending':
                return Response({'error': f'Only Pending requisitions can be {strNewStatus.lower()}.'}, status=status.HTTP_400_BAD_REQUEST)
            
            from django.utils import timezone
            strDecidedBy = objRequest.data.get('strDecidedBy', 'Stock Manager')
            
            if strNewStatus == 'Approved':
                arrItems = objRequest.data.get('arrItems', None)
                with transaction.atomic():
                    obj_req.strStatus = 'Approved'
                    obj_req.strDecidedBy = strDecidedBy
                    obj_req.dtDecidedAt = timezone.now()
                    obj_req.save()
                    
                    if arrItems:
                        for item_data in arrItems:
                            item_id = item_data.get('strId') or item_data.get('id')
                            int_qty = item_data.get('intQty')
                            if item_id:
                                RequisitionItem.objects.filter(id=item_id, objRequisition=obj_req).update(intApprovedQty=int_qty)
                    else:
                        for item in obj_req.arrItems.all():
                            item.intApprovedQty = item.intQty
                            item.save()
            elif strNewStatus == 'Rejected':
                strRejectReason = objRequest.data.get('strRejectReason', '')
                obj_req.strStatus = 'Rejected'
                obj_req.strRejectReason = strRejectReason
                obj_req.strDecidedBy = strDecidedBy
                obj_req.dtDecidedAt = timezone.now()
                obj_req.save()
                
            return Response(RequisitionSerializer(obj_req).data, status=status.HTTP_200_OK)

        serializer = RequisitionSerializer(obj_req, data=objRequest.data, partial=True)
        if serializer.is_valid():
            obj_req = serializer.save()
            return Response(RequisitionSerializer(obj_req).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, objRequest, intPk=None, strRequisitionNo=None):
        try:
            if intPk is not None:
                obj_req = Requisition.objects.get(id=intPk)
            else:
                obj_req = Requisition.objects.get(strRequisitionNo=strRequisitionNo)
        except Requisition.DoesNotExist:
            return Response({'error': 'Requisition not found'}, status=status.HTTP_404_NOT_FOUND)
        if obj_req.strStatus != 'Draft':
            return Response({'error': 'Only Draft requisitions can be deleted.'}, status=status.HTTP_400_BAD_REQUEST)
        obj_req.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# Section: Requisition Submission, Approval, and Rejection Views
class RequisitionSubmitView(APIView):
    def post(self, objRequest, intPk):
        try:
            obj_req = Requisition.objects.get(id=intPk)
        except Requisition.DoesNotExist:
            return Response({'error': 'Requisition not found'}, status=status.HTTP_404_NOT_FOUND)
        
        if obj_req.strStatus != 'Draft':
            return Response({'error': 'Only Draft requisitions can be submitted.'}, status=status.HTTP_400_BAD_REQUEST)
        
        obj_req.strStatus = 'Pending'
        obj_req.save()
        
        return Response(RequisitionSerializer(obj_req).data, status=status.HTTP_200_OK)


class RequisitionApproveView(APIView):
    def post(self, objRequest, intPk):
        try:
            obj_req = Requisition.objects.get(id=intPk)
        except Requisition.DoesNotExist:
            return Response({'error': 'Requisition not found'}, status=status.HTTP_404_NOT_FOUND)
        
        if obj_req.strStatus != 'Pending':
            return Response({'error': 'Only Pending requisitions can be approved.'}, status=status.HTTP_400_BAD_REQUEST)
        
        strDecidedBy = objRequest.data.get('strDecidedBy', 'Stock Manager')
        arrItems = objRequest.data.get('arrItems', None)
        
        from django.utils import timezone
        
        with transaction.atomic():
            obj_req.strStatus = 'Approved'
            obj_req.strDecidedBy = strDecidedBy
            obj_req.dtDecidedAt = timezone.now()
            obj_req.save()
            
            if arrItems:
                for item_data in arrItems:
                    item_id = item_data.get('strId') or item_data.get('id')
                    int_qty = item_data.get('intQty')
                    if item_id:
                        RequisitionItem.objects.filter(id=item_id, objRequisition=obj_req).update(intApprovedQty=int_qty)
            else:
                for item in obj_req.arrItems.all():
                    item.intApprovedQty = item.intQty
                    item.save()
                    
        return Response(RequisitionSerializer(obj_req).data, status=status.HTTP_200_OK)


class RequisitionRejectView(APIView):
    def post(self, objRequest, intPk):
        try:
            obj_req = Requisition.objects.get(id=intPk)
        except Requisition.DoesNotExist:
            return Response({'error': 'Requisition not found'}, status=status.HTTP_404_NOT_FOUND)
        
        if obj_req.strStatus != 'Pending':
            return Response({'error': 'Only Pending requisitions can be rejected.'}, status=status.HTTP_400_BAD_REQUEST)
        
        strRejectReason = objRequest.data.get('strRejectReason', '')
        strDecidedBy = objRequest.data.get('strDecidedBy', 'Stock Manager')
        
        from django.utils import timezone
        
        obj_req.strStatus = 'Rejected'
        obj_req.strRejectReason = strRejectReason
        obj_req.strDecidedBy = strDecidedBy
        obj_req.dtDecidedAt = timezone.now()
        obj_req.save()
        
        return Response(RequisitionSerializer(obj_req).data, status=status.HTTP_200_OK)


# Section: Dispatch Views
class DispatchListView(APIView):
    def get(self, objRequest):
        movements = StockMovement.objects.all().order_by('-dtDispatchDate')
        serializer = StockMovementSerializer(movements, many=True)
        return Response(serializer.data)
        
    def post(self, objRequest):
        payload = objRequest.data
        grn = payload.get('grn')
        requisition_no = payload.get('requisitionNo')
        destination = payload.get('destination')
        
        try:
            requisition = Requisition.objects.get(strRequisitionNo=requisition_no)
        except Requisition.DoesNotExist:
            return Response({'error': f'Requisition {requisition_no} not found'}, status=status.HTTP_404_NOT_FOUND)
            
        with transaction.atomic():
            requisition.strStatus = 'Dispatched'
            requisition.save()
            
            # Reset all requisition items' approved quantities to 0 first,
            # so that any item that was NOT dispatched is correctly set to 0.
            requisition.arrItems.all().update(intApprovedQty=0)
            
            movement = StockMovement.objects.create(
                strMovementNo=grn,
                objRequisition=requisition,
                strDestination=destination,
                strApprovedBy=payload.get('strApprovedBy') or 'Stock Manager',
                strSource=payload.get('strSource', 'Central Office'),
                strReceiveStatus='Pending'
            )
            
            items = payload.get('items', [])
            for item_data in items:
                item_code = item_data.get('strItemCode') or item_data.get('code')
                qty = int(item_data.get('qty', 0))
                
                if item_code and qty > 0:
                    item = Item.objects.filter(strCode=item_code).first()
                    if item:
                        cs, _ = CentralStock.objects.get_or_create(objItem=item)
                        cs.intCurrentStock = max(0, cs.intCurrentStock - qty)
                        cs.save()
                        item.intCurrentStock = cs.intCurrentStock
                        item.save(update_fields=['intCurrentStock'])
                        
                        # Update StockBalance for Central Office
                        sb, _ = StockBalance.objects.get_or_create(objItem=item, strLocation='Central Office')
                        sb.intQuantity = cs.intCurrentStock
                        sb.save()
                        
                        # Update RequisitionItem approved quantity to reflect what was actually dispatched
                        RequisitionItem.objects.filter(objRequisition=requisition, strItemCode=item_code).update(intApprovedQty=qty)
                        
            return Response(StockMovementSerializer(movement).data, status=status.HTTP_201_CREATED)


class DispatchDetailView(APIView):
    def get(self, objRequest, strGRNNo):
        try:
            movement = StockMovement.objects.get(strMovementNo=strGRNNo)
        except StockMovement.DoesNotExist:
            return Response({'error': 'Dispatch not found'}, status=status.HTTP_404_NOT_FOUND)
            
        return Response(StockMovementSerializer(movement).data)


class DashboardMetricsView(APIView):
    def get(self, objRequest):
        # Calculate real metrics from the database
        total_skus = Item.objects.filter(strStatus='Active').count()
        pending_approvals = Requisition.objects.filter(strStatus='Pending').count()
        
        # Calculate procurement spent
        posted_purchases = Purchase.objects.filter(strStatus='Posted')
        total_spent = sum(float(p.floaTotal or 0) for p in posted_purchases)
        
        total_branches = Branch.objects.count()
        total_suppliers = Supplier.objects.count()
        
        return Response({
            "totalSKUs": total_skus,
            "pendingApprovals": pending_approvals,
            "totalSpent": total_spent,
            "totalBranches": total_branches,
            "totalSuppliers": total_suppliers,
            "message": "Analytics dashboard metrics loaded successfully."
        })


class StockBalanceListView(APIView):
    def get(self, objRequest):
        # Query all StockBalance records ordered by item name
        balances = StockBalance.objects.all().order_by('objItem__strName')
        data = []
        for sb in balances:
            item = sb.objItem
            # Only display active items
            if item.strStatus != 'Active':
                continue
            data.append({
                "id": sb.id,
                "strCode": item.strCode,
                "strName": item.strName,
                "strCategory": item.objCategory.strName if item.objCategory else "General",
                "strUnit": item.strUnit,
                "strLocation": sb.strLocation,
                "intCurrentStock": sb.intQuantity,
                "intReorderLevel": item.intReorderLevel,
                "floaPrice": float(item.floaPrice) if item.floaPrice else 0.0,
            })
        return Response(data)


# Section: Branch Receipt Views
class BranchReceiptListView(APIView):
    def get(self, objRequest):
        # Return all stock movements/requisitions that are either Dispatched or Received
        movements = StockMovement.objects.all().order_by('-dtDispatchDate')
        serializer = StockMovementSerializer(movements, many=True)
        return Response(serializer.data)


class BranchReceiptConfirmView(APIView):
    def post(self, objRequest, intPk):
        try:
            movement = StockMovement.objects.get(id=intPk)
        except StockMovement.DoesNotExist:
            return Response({'error': 'Movement not found'}, status=status.HTTP_404_NOT_FOUND)

        if movement.strReceiveStatus == 'Received':
            return Response({'error': 'This shipment has already been received.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            movement.strReceiveStatus = 'Received'
            movement.save()

            # Update corresponding requisition status to Received
            requisition = movement.objRequisition
            if requisition:
                requisition.strStatus = 'Received'
                requisition.save()

                # Increase stock at the destination branch location for each dispatched item
                for req_item in requisition.arrItems.all():
                    item = Item.objects.filter(strCode=req_item.strItemCode).first()
                    if item:
                        sb, _ = StockBalance.objects.get_or_create(
                            objItem=item,
                            strLocation=movement.strDestination
                        )
                        sb.intQuantity += req_item.intApprovedQty
                        sb.save()

        return Response(StockMovementSerializer(movement).data, status=status.HTTP_200_OK)