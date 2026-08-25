from rest_framework import serializers
from .models import Permission, Role, UserProfile, Category, Item, Supplier, SupplierItem, Branch, CentralStock, Purchase, PurchaseItem, Requisition, RequisitionItem, StockMovement

# Section: Permission Serializer
# Converts Permission database objects into JSON format and vice versa.
class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        # List of string and integer fields to serialize
        fields = ['id', 'strCodename', 'strName', 'strDescription']


# Section: Role Serializer
# Converts Role database objects, including nested permissions, into JSON format.
class RoleSerializer(serializers.ModelSerializer):
    # listPermissions represents a list of Permission objects mapped to this role
    listPermissions = PermissionSerializer(many=True, read_only=True)
    # listPermissionIds represents the list of integer permission IDs used for write operations
    listPermissionIds = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Permission.objects.all(),
        write_only=True,
        source='listPermissions',
        required=False
    )

    class Meta:
        model = Role
        # Fields array including prefixed variables and timestamp fields
        fields = ['id', 'strName', 'strDescription', 'listPermissions', 'listPermissionIds', 'dtCreatedAt', 'dtUpdatedAt']


# Section: Static User Serializer
# Converts UserProfile database objects, adding calculated permissions list, to JSON format.
class StaticUserSerializer(serializers.ModelSerializer):
    # listPermissions is a custom list field populated by the get_listPermissions method
    listPermissions = serializers.SerializerMethodField()
    strBranch = serializers.SerializerMethodField()
    intBranchId = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        # Fields array matching the updated UserProfile model
        fields = ['id', 'strName', 'strUsername', 'strEmail', 'strRoleName', 'strStatus', 'strAvatar', 'listPermissions', 'strBranch', 'intBranchId', 'dtLastLogin']

    def get_strBranch(self, obj):
        return obj.objBranch.strName if obj.objBranch else None

    def get_intBranchId(self, obj):
        return obj.objBranch.id if obj.objBranch else None

    def get_listPermissions(self, obj):
        try:
            # objRole represents the Role model object fetched based on user's role name
            objRole = Role.objects.filter(strName__iexact=obj.strRoleName).first()
            if objRole:
                # Return list of permission codename strings
                return [objPermission.strCodename for objPermission in objRole.listPermissions.all()]
            return []
        except Exception:
            return []


# Section: Category Serializer
# Converts Category database objects to JSON with mapped property names.
class CategorySerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='strName')
    description = serializers.CharField(source='strDescription', required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = Category
        fields = ['id', 'name', 'description']


# Section: Item Serializer
# Converts Item database objects to JSON with mapped property names and category relation.
class ItemSerializer(serializers.ModelSerializer):
    code = serializers.CharField(source='strCode')
    name = serializers.CharField(source='strName')
    description = serializers.CharField(source='strDescription', required=False, allow_blank=True, allow_null=True)
    unit = serializers.CharField(source='strUnit')
    reorder_level = serializers.IntegerField(source='intReorderLevel', required=False, default=0)
    status = serializers.CharField(source='strStatus', required=False, default='Active')
    current_stock = serializers.IntegerField(source='intCurrentStock', required=False, default=0)
    price = serializers.DecimalField(source='floaPrice', max_digits=10, decimal_places=2, required=False, default=0.00)
    color = serializers.CharField(source='strColor', required=False, default='#e0e7ff')
    text_color = serializers.CharField(source='strTextColor', required=False, default='#4f46e5')
    icon = serializers.CharField(source='strIcon', required=False, default='file-text')
    
    # Category relations
    category = CategorySerializer(source='objCategory', read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        write_only=True,
        source='objCategory',
        required=False
    )
    category_name = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Item
        fields = [
            'id', 'code', 'name', 'description', 'unit', 'reorder_level', 
            'status', 'current_stock', 'price', 'color', 'text_color', 
            'icon', 'category', 'category_id', 'category_name'
        ]

    def validate(self, attrs):
        code = attrs.get('strCode')
        if self.instance is None:  # Creating
            if not code:
                raise serializers.ValidationError({"code": "Item code is required."})
            if Item.objects.filter(strCode=code).exists():
                raise serializers.ValidationError({"code": f"Item with code '{code}' is already cataloged in the inventory."})
            if not SupplierItem.objects.filter(strCode=code).exists():
                raise serializers.ValidationError({"code": f"Item code '{code}' must be taken from a supplier's catalog."})
        else:  # Updating
            if code is not None and code != self.instance.strCode:
                raise serializers.ValidationError({"code": "Item code cannot be edited."})
        return attrs

    def create(self, validated_data):
        category_name = validated_data.pop('category_name', None)
        # If category_name is passed and objCategory isn't set, find or create category by name
        if category_name and 'objCategory' not in validated_data:
            category, _ = Category.objects.get_or_create(strName=category_name)
            validated_data['objCategory'] = category
        
        # Default category if none is set
        if 'objCategory' not in validated_data:
            category, _ = Category.objects.get_or_create(strName="Hardware", defaults={"strDescription": "Hardware items"})
            validated_data['objCategory'] = category

        return super().create(validated_data)

    def update(self, instance, validated_data):
        category_name = validated_data.pop('category_name', None)
        if category_name:
            category, _ = Category.objects.get_or_create(strName=category_name)
            validated_data['objCategory'] = category
        return super().update(instance, validated_data)


# Helper function to auto-increment supplier code (SUP-XXX)
def get_next_supplier_code():
    import re
    max_num = 0
    for s in Supplier.objects.all():
        match = re.match(r'^SUP-(\d+)$', s.strCode, re.IGNORECASE)
        if match:
            val = int(match.group(1))
            if val > max_num:
                max_num = val
    return f"SUP-{max_num + 1:03d}"


# Helper function to auto-increment supplier item code (ITM-XXXX)
def get_next_supplier_item_code():
    import re
    max_num = 0
    for si in SupplierItem.objects.all():
        match = re.match(r'^ITM-(\d+)$', si.strCode, re.IGNORECASE)
        if match:
            val = int(match.group(1))
            if val > max_num:
                max_num = val
    for itm in Item.objects.all():
        match = re.match(r'^ITM-(\d+)$', itm.strCode, re.IGNORECASE)
        if match:
            val = int(match.group(1))
            if val > max_num:
                max_num = val
    return f"ITM-{max_num + 1:04d}"


# Section: Supplier Item Serializer
# Serializes individual items associated with a supplier.
class SupplierItemSerializer(serializers.ModelSerializer):
    code = serializers.CharField(source='strCode', required=False, allow_blank=True)
    name = serializers.CharField(source='strName')
    category = CategorySerializer(source='objCategory', read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        write_only=True,
        source='objCategory',
        required=False,
        allow_null=True
    )
    price = serializers.DecimalField(source='floaPrice', max_digits=10, decimal_places=2, required=False, default=0.00)

    class Meta:
        model = SupplierItem
        fields = ['id', 'code', 'name', 'category', 'category_id', 'price']


# Section: Supplier Serializer
# Serializes a Supplier along with its catalog of supplied items.
class SupplierSerializer(serializers.ModelSerializer):
    code = serializers.CharField(source='strCode', required=False, read_only=True)
    name = serializers.CharField(source='strName')
    email = serializers.EmailField(source='strEmail')
    phone = serializers.CharField(source='strPhone', required=False, allow_blank=True, allow_null=True)
    items = SupplierItemSerializer(many=True, required=False)

    class Meta:
        model = Supplier
        fields = ['id', 'code', 'name', 'email', 'phone', 'items']

    def create(self, validated_data):
        validated_data['strCode'] = get_next_supplier_code()
        items_data = validated_data.pop('items', [])
        # validated_data keys are converted by serializers to model fields (strCode, strName, etc.)
        supplier = Supplier.objects.create(**validated_data)
        for item_data in items_data:
            item_data['strCode'] = get_next_supplier_item_code()
            SupplierItem.objects.create(objSupplier=supplier, **item_data)
        return supplier

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        instance.strName = validated_data.get('strName', instance.strName)
        instance.strEmail = validated_data.get('strEmail', instance.strEmail)
        instance.strPhone = validated_data.get('strPhone', instance.strPhone)
        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                code = item_data.get('strCode')
                if not code or not code.startswith('ITM-'):
                    code = get_next_supplier_item_code()
                category = item_data.get('objCategory')
                price = item_data.get('floaPrice', 0.00)
                SupplierItem.objects.create(objSupplier=instance, strCode=code, strName=item_data.get('strName'), objCategory=category, floaPrice=price)
        
        return instance


# Section: Branch Serializer
# Converts Branch database objects to JSON with mapped property names.
class BranchSerializer(serializers.ModelSerializer):
    code = serializers.CharField(source='strCode', required=False, read_only=True)
    name = serializers.CharField(source='strName')
    location = serializers.CharField(source='strLocation')
    contact = serializers.CharField(source='strContact')
    manager_name = serializers.CharField(source='strManagerName', required=False, allow_blank=True, allow_null=True)
    manager_email = serializers.EmailField(source='strManagerEmail', required=False, allow_blank=True, allow_null=True)
    manager_phone = serializers.CharField(source='strManagerPhone', required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = Branch
        fields = ['id', 'code', 'name', 'location', 'contact', 'manager_name', 'manager_email', 'manager_phone']

    def create(self, validated_data):
        import re
        max_num = 0
        for b in Branch.objects.all():
            match = re.match(r'^BR-(\d+)$', b.strCode, re.IGNORECASE)
            if match:
                val = int(match.group(1))
                if val > max_num:
                    max_num = val
        validated_data['strCode'] = f"BR-{max_num + 1:03d}"
        return super().create(validated_data)


# Section: Central Stock Serializer
# Serializes CentralStock model
class CentralStockSerializer(serializers.ModelSerializer):
    item_code = serializers.CharField(source='objItem.strCode', read_only=True)
    item_name = serializers.CharField(source='objItem.strName', read_only=True)
    current_stock = serializers.IntegerField(source='intCurrentStock')

    class Meta:
        model = CentralStock
        fields = ['id', 'item_code', 'item_name', 'current_stock', 'dtLastUpdated']


# Section: Purchase Item Serializer
# Serializes lines of a Purchase transaction
class PurchaseItemSerializer(serializers.ModelSerializer):
    strId = serializers.CharField(source='id', read_only=True)
    strCode = serializers.CharField()
    strName = serializers.CharField()
    strCategory = serializers.CharField(required=False, default="Office Supplies")
    strUnit = serializers.CharField(required=False, default="Box")
    intQty = serializers.IntegerField()
    floaPrice = serializers.DecimalField(max_digits=10, decimal_places=2)
    strDescription = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    strColor = serializers.CharField(required=False, default='#e0e7ff')
    strTextColor = serializers.CharField(required=False, default='#4f46e5')
    strIcon = serializers.CharField(required=False, default='file-text')

    class Meta:
        model = PurchaseItem
        fields = [
            'strId', 'strCode', 'strName', 'strCategory', 'strUnit', 
            'intQty', 'floaPrice', 'strDescription', 'strColor', 
            'strTextColor', 'strIcon'
        ]


# Section: Purchase Serializer
# Serializes the Purchase model along with nested PurchaseItem objects
class PurchaseSerializer(serializers.ModelSerializer):
    strId = serializers.CharField(source='id', read_only=True)
    strPurchaseNo = serializers.CharField()
    strSupplier = serializers.CharField()
    strInvoiceDate = serializers.DateField()
    strLocation = serializers.CharField(required=False, default="Central Office")
    strStatus = serializers.CharField(required=False, default="Draft")
    floaSubtotal = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=0.00)
    floaVat = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=0.00)
    floaTotal = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=0.00)
    arrItems = PurchaseItemSerializer(source='items', many=True)

    class Meta:
        model = Purchase
        fields = [
            'strId', 'strPurchaseNo', 'strSupplier', 'strInvoiceDate', 
            'strLocation', 'strStatus', 'floaSubtotal', 'floaVat', 
            'floaTotal', 'arrItems', 'dtCreatedAt', 'dtUpdatedAt'
        ]

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        purchase = Purchase.objects.create(**validated_data)
        for item_data in items_data:
            PurchaseItem.objects.create(objPurchase=purchase, **item_data)
        return purchase

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        instance.strPurchaseNo = validated_data.get('strPurchaseNo', instance.strPurchaseNo)
        instance.strSupplier = validated_data.get('strSupplier', instance.strSupplier)
        instance.strInvoiceDate = validated_data.get('strInvoiceDate', instance.strInvoiceDate)
        instance.strLocation = validated_data.get('strLocation', instance.strLocation)
        instance.strStatus = validated_data.get('strStatus', instance.strStatus)
        instance.floaSubtotal = validated_data.get('floaSubtotal', instance.floaSubtotal)
        instance.floaVat = validated_data.get('floaVat', instance.floaVat)
        instance.floaTotal = validated_data.get('floaTotal', instance.floaTotal)
        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                PurchaseItem.objects.create(objPurchase=instance, **item_data)

        return instance


# Section: Requisition Item Serializer
# Serializes a single line item within a Requisition.
class RequisitionItemSerializer(serializers.ModelSerializer):
    strId = serializers.CharField(source='id', read_only=True)
    strItemCode = serializers.CharField()
    strName = serializers.CharField()
    strDescription = serializers.CharField(required=False, allow_blank=True, default='')
    strUnit = serializers.CharField(required=False, default='Nos')
    floaPrice = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0.00)
    intQty = serializers.IntegerField(default=1)
    intApprovedQty = serializers.IntegerField(default=0)
    intOnHand = serializers.IntegerField(required=False, default=0)
    strColor = serializers.CharField(required=False, default='#e0e7ff')
    strTextColor = serializers.CharField(required=False, default='#4f46e5')
    strIcon = serializers.CharField(required=False, default='file-text')
    intCurrentStock = serializers.SerializerMethodField()
    intReorderLevel = serializers.SerializerMethodField()

    class Meta:
        model = RequisitionItem
        fields = [
            'strId', 'strItemCode', 'strName', 'strDescription', 'strUnit',
            'floaPrice', 'intQty', 'intApprovedQty', 'intOnHand', 'strColor', 'strTextColor',
            'strIcon', 'intCurrentStock', 'intReorderLevel'
        ]

    def get_intCurrentStock(self, obj):
        item = Item.objects.filter(strCode=obj.strItemCode).first()
        return item.intCurrentStock if item else 0

    def get_intReorderLevel(self, obj):
        item = Item.objects.filter(strCode=obj.strItemCode).first()
        return item.intReorderLevel if item else 0


# Section: Requisition Serializer
# Serializes a Requisition header along with nested RequisitionItem objects.
class RequisitionSerializer(serializers.ModelSerializer):
    strId = serializers.CharField(source='id', read_only=True)
    strRequisitionNo = serializers.CharField(read_only=True)
    strBranch = serializers.CharField(source='strBranchName', required=False, default='')
    strRequiredByDate = serializers.DateField()
    strRemarks = serializers.CharField(required=False, allow_blank=True, default='')
    strStatus = serializers.CharField(required=False, default='Draft')
    floaTotalValue = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=0.00)
    intCreatedById = serializers.IntegerField(write_only=True, required=False)
    strRejectReason = serializers.CharField(required=False, allow_blank=True, default='')
    strDecidedBy = serializers.CharField(required=False, allow_blank=True, default='')
    dtDecidedAt = serializers.DateTimeField(required=False, allow_null=True, read_only=True)
    strRaisedBy = serializers.SerializerMethodField()
    strAssignedToName = serializers.SerializerMethodField()
    arrItems = RequisitionItemSerializer(many=True)

    def get_strRaisedBy(self, obj):
        return obj.objCreatedBy.strName if obj.objCreatedBy else 'Unknown'

    def get_strAssignedToName(self, obj):
        if obj.strAssignedToName:
            return obj.strAssignedToName
        return obj.objAssignedTo.strName if obj.objAssignedTo else ''

    class Meta:
        model = Requisition
        fields = [
            'strId', 'strRequisitionNo', 'strBranch', 'strRequiredByDate',
            'strRemarks', 'strStatus', 'floaTotalValue', 'intCreatedById',
            'strRejectReason', 'strDecidedBy', 'dtDecidedAt', 'strRaisedBy',
            'strAssignedToName', 'arrItems', 'dtCreatedAt', 'dtUpdatedAt'
        ]

    def create(self, validated_data):
        # Extract nested items
        items_data = validated_data.pop('arrItems', [])
        # Resolve creator by ID
        int_creator_id = validated_data.pop('intCreatedById', None)
        obj_creator = None
        if int_creator_id:
            obj_creator = UserProfile.objects.filter(id=int_creator_id).first()
        # Resolve branch by name
        str_branch_name = validated_data.get('strBranchName', '')
        obj_branch = Branch.objects.filter(strName__iexact=str_branch_name).first() if str_branch_name else None
        # Create requisition (strRequisitionNo auto-generated in model.save)
        obj_req = Requisition.objects.create(
            objCreatedBy=obj_creator,
            objBranch=obj_branch,
            **validated_data
        )
        for item_data in items_data:
            RequisitionItem.objects.create(objRequisition=obj_req, **item_data)
        return obj_req

    def update(self, instance, validated_data):
        items_data = validated_data.pop('arrItems', None)
        validated_data.pop('intCreatedById', None)
        # Update branch if name changed
        str_branch_name = validated_data.get('strBranchName', instance.strBranchName)
        obj_branch = Branch.objects.filter(strName__iexact=str_branch_name).first() if str_branch_name else instance.objBranch
        instance.objBranch = obj_branch
        instance.strBranchName = validated_data.get('strBranchName', instance.strBranchName)
        instance.strRequiredByDate = validated_data.get('strRequiredByDate', instance.strRequiredByDate)
        instance.strRemarks = validated_data.get('strRemarks', instance.strRemarks)
        instance.strStatus = validated_data.get('strStatus', instance.strStatus)
        instance.floaTotalValue = validated_data.get('floaTotalValue', instance.floaTotalValue)
        instance.save()
        # Replace all items if provided
        if items_data is not None:
            instance.arrItems.all().delete()
            for item_data in items_data:
                RequisitionItem.objects.create(objRequisition=instance, **item_data)
        return instance


# Section: Stock Movement Serializer
# Serializes the StockMovement model to track dispatches.
class StockMovementSerializer(serializers.ModelSerializer):
    strId = serializers.CharField(source='id', read_only=True)
    strRequisitionNo = serializers.CharField(source='objRequisition.strRequisitionNo', read_only=True)
    arrItems = serializers.SerializerMethodField()

    class Meta:
        model = StockMovement
        fields = [
            'strId', 'strMovementNo', 'objRequisition', 'strRequisitionNo', 'strSource', 
            'strDestination', 'dtDispatchDate', 'strReceiveStatus', 'strApprovedBy', 'arrItems'
        ]

    def get_arrItems(self, obj):
        req = obj.objRequisition
        if req:
            return RequisitionItemSerializer(req.arrItems.all(), many=True).data
        return []
