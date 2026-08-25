from django.core.management.base import BaseCommand
from rbac.models import Category, Item, Supplier, SupplierItem

# Command to clear/remove categories, items, suppliers and supplier items in database
class Command(BaseCommand):
    help = 'Clears all inventory categories, items, suppliers, and supplier items from the database.'

    def handle(self, *args, **kwargs):
        self.stdout.write("Clearing inventory and supplier data...")

        # Delete all SupplierItem first (due to foreign key constraints)
        supplier_items_deleted, _ = SupplierItem.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f"Deleted {supplier_items_deleted} supplier items."))

        # Delete all items
        items_deleted, _ = Item.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f"Deleted {items_deleted} items."))

        # Delete all suppliers
        suppliers_deleted, _ = Supplier.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f"Deleted {suppliers_deleted} suppliers."))

        # Delete all categories
        categories_deleted, _ = Category.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f"Deleted {categories_deleted} categories."))

        self.stdout.write(self.style.SUCCESS("Inventory and supplier clearance completed successfully!"))

