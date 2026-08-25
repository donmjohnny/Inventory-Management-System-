from django.contrib import admin
from .models import Permission, Role, UserProfile, Category, Item, Supplier, SupplierItem, Branch, CentralStock, Purchase, PurchaseItem

admin.site.register(Permission)
admin.site.register(Role)
admin.site.register(UserProfile)
admin.site.register(Category)
admin.site.register(Item)
admin.site.register(Supplier)
admin.site.register(SupplierItem)
admin.site.register(Branch)
admin.site.register(CentralStock)
admin.site.register(Purchase)
admin.site.register(PurchaseItem)

