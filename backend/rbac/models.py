from django.db import models

# Section: Permission Model
# This model represents system access permissions that can be assigned to roles.
class Permission(models.Model):
    # strCodename is a string storing the unique short name of the permission (e.g. 'read_users')
    strCodename = models.CharField(max_length=100, unique=True)
    # strName is a string storing the readable name of the permission (e.g. 'Read Users')
    strName = models.CharField(max_length=255)
    # strDescription is a string storing details about what this permission allows
    strDescription = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.strName} ({self.strCodename})"


# Section: Role Model
# This model represents a role like 'Admin' or 'Stock Manager' which groups multiple permissions.
class Role(models.Model):
    # strName is a string storing the unique name of the role (e.g. 'Admin')
    strName = models.CharField(max_length=100, unique=True)
    # strDescription is a string storing a description of this role's responsibilities
    strDescription = models.TextField(blank=True, null=True)
    # listPermissions is a list of permissions associated with this role
    listPermissions = models.ManyToManyField(Permission, related_name='roles', blank=True)
    # dtCreatedAt stores the date and time when the role was created
    dtCreatedAt = models.DateTimeField(auto_now_add=True)
    # dtUpdatedAt stores the date and time when the role was last updated
    dtUpdatedAt = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.strName


# Section: UserProfile Model
# This model represents a user account in the system with their profile details and role.
class UserProfile(models.Model):
    # strName is a string storing the full name of the user (e.g. 'Sarah Connor')
    strName = models.CharField(max_length=255)
    # strUsername is a string storing the unique login username of the user (e.g. 'sarah_c')
    strUsername = models.CharField(max_length=150, unique=True)
    # strEmail is a string storing the unique email address of the user
    strEmail = models.EmailField(unique=True)
    # strRoleName is a string storing the name of the role assigned to the user
    strRoleName = models.CharField(max_length=100)
    # strStatus is a string indicating if the user is 'Active' or 'Inactive'
    strStatus = models.CharField(max_length=20, default='Active')
    # strAvatar is a string storing the URL of the user's avatar image
    strAvatar = models.URLField(max_length=500, blank=True, null=True)
    # strPassword is a string storing the encrypted password of the user
    strPassword = models.CharField(max_length=255, default='pbkdf2_sha256$260000$C1zTCIuRZRMswUiHrsFds9$IWTahia7wl5VazKSMVKAyrKys+gkgDb60cc4OMKJpuo=')
    # objBranch links the user to their assigned Branch
    objBranch = models.ForeignKey('Branch', on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    # dtCreatedAt stores the date and time when the user profile was created
    dtCreatedAt = models.DateTimeField(auto_now_add=True)
    # dtLastLogin stores the date and time when the user last signed in
    dtLastLogin = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.strName


# Section: Category Model
# This model represents an inventory category like 'Office Supplies' or 'Electronics'.
class Category(models.Model):
    # strName is a string storing the unique name of the category
    strName = models.CharField(max_length=255, unique=True)
    # strDescription is a string storing details about this category
    strDescription = models.TextField(blank=True, null=True)
    # objCreatedBy links this category to the UserProfile who created it
    objCreatedBy = models.ForeignKey(UserProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name='categories')

    def __str__(self):
        return self.strName


# Section: Item Model
# This model represents an inventory item or SKU cataloged in the system.
class Item(models.Model):
    # strCode is a unique code assigned to the item (e.g. 'ITM-0001')
    strCode = models.CharField(max_length=50, unique=True)
    # strName is the name of the item
    strName = models.CharField(max_length=255)
    # objCategory is the category this item belongs to
    objCategory = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='items')
    # strUnit is the unit of measure (e.g. 'Box', 'Ream')
    strUnit = models.CharField(max_length=50)
    # intReorderLevel is the threshold quantity for low-stock alerts
    intReorderLevel = models.IntegerField(default=0)
    # strStatus indicates if the item is 'Active' or 'Inactive'
    strStatus = models.CharField(max_length=20, default='Active')
    # strDescription is a string description of the item details
    strDescription = models.TextField(blank=True, null=True)
    # intCurrentStock is the current inventory quantity on hand
    intCurrentStock = models.IntegerField(default=0)
    # floaPrice is the unit price of the item
    floaPrice = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    # strColor is a string representing color styling of the item's tag
    strColor = models.CharField(max_length=20, default='#e0e7ff')
    # strTextColor is a string representing text color styling
    strTextColor = models.CharField(max_length=20, default='#4f46e5')
    # strIcon is a string representing the icon name associated with the item
    strIcon = models.CharField(max_length=50, default='file-text')
    # objCreatedBy links this item to the UserProfile who created/added it
    objCreatedBy = models.ForeignKey(UserProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name='items')

    def __str__(self):
        return f"{self.strName} ({self.strCode})"

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        # Ensure CentralStock is synchronized
        central_stock, created = CentralStock.objects.get_or_create(objItem=self)
        if is_new or central_stock.intCurrentStock != self.intCurrentStock:
            central_stock.intCurrentStock = self.intCurrentStock
            central_stock.save()



# Section: Supplier Model
# Represents a product vendor/supplier in the system.
class Supplier(models.Model):
    # strCode is a unique code assigned to the supplier (e.g. 'SUP-001')
    strCode = models.CharField(max_length=50, unique=True)
    # strName is the supplier/company name
    strName = models.CharField(max_length=255)
    # strEmail is the supplier's contact email address
    strEmail = models.EmailField()
    # strPhone is the supplier's contact phone number
    strPhone = models.CharField(max_length=50, blank=True, null=True)

    def __str__(self):
        return f"{self.strName} ({self.strCode})"


# Section: Supplier Item Model
# Represents a catalog item supplied by a specific vendor.
class SupplierItem(models.Model):
    # objSupplier links this item to a Supplier
    objSupplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='items')
    # strCode is the item code for identification (e.g. 'ITM-01')
    strCode = models.CharField(max_length=50)
    # strName is the name of the supplied item
    strName = models.CharField(max_length=255)
    # objCategory links this supplier item to a Category
    objCategory = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='supplier_items')
    # floaPrice stores the price of this supplied item per unit
    floaPrice = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    def __str__(self):
        return f"{self.strName} ({self.strCode})"


# Section: Branch Model
# Represents an enterprise business branch location.
class Branch(models.Model):
    # strCode is a unique code assigned to the branch (e.g. 'BR-001')
    strCode = models.CharField(max_length=50, unique=True)
    # strName is the name of the branch
    strName = models.CharField(max_length=255)
    # strLocation is the geographic location of the branch
    strLocation = models.CharField(max_length=255)
    # strContact is the contact phone number of the branch
    strContact = models.CharField(max_length=50)
    # strManagerName is the full name of the branch manager
    strManagerName = models.CharField(max_length=255, blank=True, null=True)
    # strManagerEmail is the contact email of the branch manager
    strManagerEmail = models.EmailField(blank=True, null=True)
    # strManagerPhone is the mobile number of the branch manager
    strManagerPhone = models.CharField(max_length=50, blank=True, null=True)

    def __str__(self):
        return f"{self.strName} ({self.strCode})"


# Section: Central Stock Model
# Tracks stock levels of items in the Central Office inventory.
class CentralStock(models.Model):
    # objItem links to a specific Item catalog entry
    objItem = models.OneToOneField(Item, on_delete=models.CASCADE, related_name='central_stock')
    # intCurrentStock stores the current quantity at Central location
    intCurrentStock = models.IntegerField(default=0)
    # dtLastUpdated stores the time of the last stock transaction
    dtLastUpdated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.objItem.strName}: {self.intCurrentStock}"


# Section: Purchase Model
# Represents a purchase transaction in the database.
class Purchase(models.Model):
    # strPurchaseNo is the unique identifier for the transaction (e.g. PUR-2026-0001)
    strPurchaseNo = models.CharField(max_length=50, unique=True)
    # strSupplier is a comma-separated list of suppliers or the active supplier name
    strSupplier = models.TextField()
    # strInvoiceDate is the date the purchase invoice was issued
    strInvoiceDate = models.DateField()
    # strLocation is the destination warehouse location (e.g., Central Office)
    strLocation = models.CharField(max_length=100, default="Central Office")
    # strStatus tracks the state of the invoice: Draft, Posted, Reversed
    strStatus = models.CharField(max_length=20, default="Draft")
    # floaSubtotal tracks purchase sum total before VAT
    floaSubtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    # floaVat tracks VAT applied
    floaVat = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    # floaTotal is the final cost including VAT
    floaTotal = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    # dtCreatedAt and dtUpdatedAt track creation and modifications
    dtCreatedAt = models.DateTimeField(auto_now_add=True)
    dtUpdatedAt = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.strPurchaseNo} ({self.strStatus})"


# Section: Purchase Item Model
# Represents an individual product line item within a purchase order.
class PurchaseItem(models.Model):
    # objPurchase links this line item to the parent Purchase record
    objPurchase = models.ForeignKey(Purchase, on_delete=models.CASCADE, related_name='items')
    # strCode is the unique code of the item
    strCode = models.CharField(max_length=50)
    # strName is the name of the item
    strName = models.CharField(max_length=255)
    # strCategory is the category of the item
    strCategory = models.CharField(max_length=100)
    # strUnit is the unit of measure (e.g. Box, Ream, Nos)
    strUnit = models.CharField(max_length=50)
    # intQty is the quantity purchased
    intQty = models.IntegerField(default=1)
    # floaPrice is the price paid per unit
    floaPrice = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    # strDescription is any remark or detail for this item row
    strDescription = models.TextField(blank=True, null=True)
    # strColor, strTextColor, strIcon store visual presentation settings
    strColor = models.CharField(max_length=20, default='#e0e7ff')
    strTextColor = models.CharField(max_length=20, default='#4f46e5')
    strIcon = models.CharField(max_length=50, default='file-text')

    def __str__(self):
        return f"{self.strName} ({self.intQty} {self.strUnit})"


# Section: Requisition Model
# Represents a stock request raised by a branch user to the central office.
class Requisition(models.Model):
    STATUS_CHOICES = [
        ('Draft', 'Draft'),
        ('Pending', 'Pending'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
        ('Dispatched', 'Dispatched'),
        ('Received', 'Received'),
    ]
    # strRequisitionNo is the unique identifier (e.g. REQ-2026-0001)
    strRequisitionNo = models.CharField(max_length=50, unique=True, blank=True)
    # objBranch links the requisition to the requesting branch
    objBranch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name='requisitions')
    # strBranchName is a denormalized branch name string for display
    strBranchName = models.CharField(max_length=255, blank=True, default='')
    # objCreatedBy links the requisition to the user who raised it
    objCreatedBy = models.ForeignKey(UserProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name='requisitions')
    # strRequiredByDate is the date by which the stock is needed
    strRequiredByDate = models.DateField()
    # strRemarks is an optional note from the requester
    strRemarks = models.CharField(max_length=500, blank=True, default='')
    # strStatus tracks the state: Draft, Pending, Approved, Rejected
    strStatus = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Draft')
    # floaTotalValue is the computed total value of all requested items
    floaTotalValue = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    # strRejectReason is the reason provided when a requisition is rejected
    strRejectReason = models.CharField(max_length=1000, blank=True, default='')
    # strDecidedBy stores the name of the approver / rejecter
    strDecidedBy = models.CharField(max_length=255, blank=True, default='')
    # dtDecidedAt stores the timestamp when the approval/rejection decision was made
    dtDecidedAt = models.DateTimeField(null=True, blank=True)
    # objAssignedTo links the requisition to the Central Office Stock Manager it was auto-routed to
    objAssignedTo = models.ForeignKey(UserProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_requisitions')
    # strAssignedToName is a denormalized name of the assigned stock manager for quick display
    strAssignedToName = models.CharField(max_length=255, blank=True, default='')
    # dtCreatedAt and dtUpdatedAt track creation and modification times
    dtCreatedAt = models.DateTimeField(auto_now_add=True)
    dtUpdatedAt = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Auto-generate requisition number if not set
        if not self.strRequisitionNo:
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
            self.strRequisitionNo = f'REQ-{year}-{max_num + 1:04d}'
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.strRequisitionNo} ({self.strStatus})"


# Section: Requisition Item Model
# Represents a single line item within a Requisition request.
class RequisitionItem(models.Model):
    # objRequisition links this line item to the parent Requisition
    objRequisition = models.ForeignKey(Requisition, on_delete=models.CASCADE, related_name='arrItems')
    # strItemCode is the catalog item code (e.g. ITM-0001)
    strItemCode = models.CharField(max_length=50)
    # strName is the name of the requested item
    strName = models.CharField(max_length=255)
    # strDescription is the description of the requested item
    strDescription = models.TextField(blank=True, default='')
    # strUnit is the unit of measure (e.g. Box, Ream)
    strUnit = models.CharField(max_length=50, default='Nos')
    # floaPrice is the unit price at time of requisition
    floaPrice = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    # intQty is the requested quantity
    intQty = models.IntegerField(default=1)
    # intApprovedQty is the quantity actually approved to be dispatched
    intApprovedQty = models.IntegerField(default=0)
    # intOnHand is the branch stock on hand at time of request
    intOnHand = models.IntegerField(default=0)
    # strColor, strTextColor, strIcon store visual styling metadata
    strColor = models.CharField(max_length=20, default='#e0e7ff')
    strTextColor = models.CharField(max_length=20, default='#4f46e5')
    strIcon = models.CharField(max_length=50, default='file-text')

    def __str__(self):
        return f"{self.strName} x{self.intQty} ({self.objRequisition.strRequisitionNo})"


# Section: Stock Movement Model
# Represents the physical dispatch of approved items to a branch.
class StockMovement(models.Model):
    # strMovementNo is the unique document number (e.g. MOV-2026-0001)
    strMovementNo = models.CharField(max_length=50, unique=True, blank=True)
    # objRequisition links this movement back to the request
    objRequisition = models.ForeignKey(Requisition, on_delete=models.CASCADE, related_name='movements')
    # strSource is the dispatching location
    strSource = models.CharField(max_length=100, default="Central Office")
    # strDestination is the receiving location (branch name)
    strDestination = models.CharField(max_length=255)
    # dtDispatchDate is the date and time of dispatch
    dtDispatchDate = models.DateTimeField(auto_now_add=True)
    # strReceiveStatus tracks the receipt at the branch
    strReceiveStatus = models.CharField(max_length=20, default="Pending")
    # strApprovedBy is the name of the Stock Manager who approved this dispatch
    strApprovedBy = models.CharField(max_length=255)
    
    def save(self, *args, **kwargs):
        if not self.strMovementNo:
            import re
            from django.utils import timezone
            year = timezone.now().year
            max_num = 0
            for m in StockMovement.objects.filter(strMovementNo__startswith=f'MOV-{year}-'):
                match = re.match(rf'^MOV-{year}-(\d+)$', m.strMovementNo)
                if match:
                    val = int(match.group(1))
                    if val > max_num:
                        max_num = val
            self.strMovementNo = f'MOV-{year}-{max_num + 1:04d}'
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.strMovementNo} ({self.strReceiveStatus})"


# Section: Stock Balance Model
# Holds one balance per item per location as requested by the stock module requirements.
class StockBalance(models.Model):
    # objItem links to a specific Item catalog entry
    objItem = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='stock_balance_lines')
    # strLocation represents either Central Office or a specific Branch location name
    strLocation = models.CharField(max_length=255)
    # intQuantity stores the current on-hand amount of the item at the location
    intQuantity = models.IntegerField(default=0)
    # dtLastUpdated stores the time of the last stock transaction for this record
    dtLastUpdated = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('objItem', 'strLocation')

    def __str__(self):
        return f"{self.objItem.strCode} @ {self.strLocation}: {self.intQuantity}"
