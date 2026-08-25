from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rbac.models import Permission, Role, UserProfile, Category, Item, Supplier, SupplierItem

# Section: RBAC API Test Suite
# Tests permission query, role crud operations, user creation/modification, and deletion endpoints.
class RBACTests(APITestCase):

    def setUp(self):
        # Section: Clean the DB and seed default permissions and roles for tests
        Permission.objects.all().delete()
        Role.objects.all().delete()

        # objReadUsers is the permission object for viewing users
        self.objReadUsers = Permission.objects.create(
            strCodename="read_users",
            strName="Read Users",
            strDescription="Can view users"
        )
        # objWriteUsers is the permission object for modifying users
        self.objWriteUsers = Permission.objects.create(
            strCodename="write_users",
            strName="Write Users",
            strDescription="Can edit users"
        )

        # objAdminRole is the Admin Role object with both read and write permissions
        self.objAdminRole = Role.objects.create(
            strName="Admin",
            strDescription="Administrator"
        )
        self.objAdminRole.listPermissions.add(self.objReadUsers, self.objWriteUsers)

        # objViewerRole is the Viewer Role object with read-only permission
        self.objViewerRole = Role.objects.create(
            strName="Viewer",
            strDescription="Viewer"
        )
        self.objViewerRole.listPermissions.add(self.objReadUsers)

        # objUser1 is the Sarah Connor Admin profile
        self.objUser1 = UserProfile.objects.create(
            strName="Sarah Connor",
            strUsername="sarah_c",
            strEmail="sarah.connor@cyberdyne.com",
            strRoleName="Admin",
            strStatus="Active"
        )
        # objUser2 is the John Connor Viewer profile
        self.objUser2 = UserProfile.objects.create(
            strName="John Connor",
            strUsername="john_c",
            strEmail="john.connor@resistance.net",
            strRoleName="Viewer",
            strStatus="Active"
        )

    def test_list_permissions(self):
        # Section: Verify permissions listing API returns correct records
        strUrl = reverse('permission-list')
        objResponse = self.client.get(strUrl)
        self.assertEqual(objResponse.status_code, status.HTTP_200_OK)
        self.assertEqual(len(objResponse.data), 2)
        # listCodenames extracts codenames of all returned permissions
        listCodenames = [dictPerm['strCodename'] for dictPerm in objResponse.data]
        self.assertIn('read_users', listCodenames)
        self.assertIn('write_users', listCodenames)

    def test_list_roles(self):
        # Section: Verify roles listing API returns both admin and viewer roles
        strUrl = reverse('role-list')
        objResponse = self.client.get(strUrl)
        self.assertEqual(objResponse.status_code, status.HTTP_200_OK)
        self.assertEqual(len(objResponse.data), 2)

    def test_create_role(self):
        # Section: Verify new role creation and proper permission mapping
        strUrl = reverse('role-list')
        dictData = {
            "strName": "Manager",
            "strDescription": "Manager Role",
            "listPermissionIds": [self.objReadUsers.id]
        }
        objResponse = self.client.post(strUrl, dictData, format='json')
        self.assertEqual(objResponse.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Role.objects.filter(strName="Manager").count(), 1)
        # objManager retrieves the newly created role to inspect permissions
        objManager = Role.objects.get(strName="Manager")
        self.assertIn(self.objReadUsers, objManager.listPermissions.all())

    def test_list_static_users(self):
        # Section: Verify listing users maps details and list of resolved permissions
        strUrl = reverse('static-user-list')
        objResponse = self.client.get(strUrl)
        self.assertEqual(objResponse.status_code, status.HTTP_200_OK)
        # dictSarah retrieves Sarah Connor from the listing response
        dictSarah = next(dictUser for dictUser in objResponse.data if dictUser['strUsername'] == 'sarah_c')
        self.assertIn('read_users', dictSarah['listPermissions'])
        self.assertIn('write_users', dictSarah['listPermissions'])

    def test_update_static_user_role(self):
        # Section: Verify updating user's role updates their permissions
        strUrl = reverse('static-user-detail', kwargs={'intPk': self.objUser1.id})
        dictData = {"strRoleName": "Viewer"}
        objResponse = self.client.patch(strUrl, dictData, format='json')
        self.assertEqual(objResponse.status_code, status.HTTP_200_OK)
        self.assertEqual(objResponse.data['strRoleName'], 'Viewer')
        self.assertIn('read_users', objResponse.data['listPermissions'])
        self.assertNotIn('write_users', objResponse.data['listPermissions'])

    def test_update_static_user_invalid_role(self):
        # Section: Verify updating user to an invalid/non-existent role returns bad request
        strUrl = reverse('static-user-detail', kwargs={'intPk': self.objUser1.id})
        dictData = {"strRoleName": "NonExistentRole"}
        objResponse = self.client.patch(strUrl, dictData, format='json')
        self.assertEqual(objResponse.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("does not exist", objResponse.data['error'])

    def test_create_static_user(self):
        # Section: Verify creating a user creates record with matching fields and default status
        strUrl = reverse('static-user-list')
        Role.objects.create(strName="Stock Manager", strDescription="Stock Manager")
        dictData = {
            "strFirstName": "John",
            "strLastName": "Doe",
            "strUsername": "john_d",
            "strEmail": "john.doe@example.com",
            "strRoleName": "manager"
        }
        objResponse = self.client.post(strUrl, dictData, format='json')
        self.assertEqual(objResponse.status_code, status.HTTP_201_CREATED)
        self.assertEqual(objResponse.data['strName'], 'John Doe')
        self.assertEqual(objResponse.data['strUsername'], 'john_d')
        self.assertEqual(objResponse.data['strRoleName'], 'Stock Manager')

    def test_delete_static_user(self):
        # Section: Verify deleting user deletes from database
        strUrl = reverse('static-user-detail', kwargs={'intPk': self.objUser1.id})
        objResponse = self.client.delete(strUrl)
        self.assertEqual(objResponse.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(UserProfile.objects.filter(id=self.objUser1.id).exists())

    def test_update_static_user_details(self):
        # Section: Verify patching profile details updates fields
        strUrl = reverse('static-user-detail', kwargs={'intPk': self.objUser1.id})
        dictData = {
            "strName": "Sarah J. Connor",
            "strUsername": "sarah_j_c",
            "strEmail": "sarah.j.connor@cyberdyne.com"
        }
        objResponse = self.client.patch(strUrl, dictData, format='json')
        self.assertEqual(objResponse.status_code, status.HTTP_200_OK)
        self.assertEqual(objResponse.data['strName'], 'Sarah J. Connor')
        self.assertEqual(objResponse.data['strUsername'], 'sarah_j_c')
        self.assertEqual(objResponse.data['strEmail'], 'sarah.j.connor@cyberdyne.com')

    def test_create_supplier_auto_code(self):
        # Section: Verify creating a supplier automatically assigns sequential SUP-XXX code
        strUrl = reverse('supplier-add')
        dictData = {
            "name": "Acme Widgets Corp",
            "email": "contact@acme.com",
            "phone": "123-456"
        }
        objResponse = self.client.post(strUrl, dictData, format='json')
        self.assertEqual(objResponse.status_code, status.HTTP_201_CREATED)
        self.assertEqual(objResponse.data['code'], 'SUP-001')
        self.assertTrue(Supplier.objects.filter(strCode='SUP-001').exists())

    def test_create_supplier_items_auto_code(self):
        # Section: Verify supplier items are assigned auto-incremented ITM-XXXX codes
        strUrl = reverse('supplier-add')
        dictData = {
            "name": "Alpha Supply",
            "email": "info@alpha.com",
            "items": [
                {"name": "Keyboard Row"},
                {"name": "Mouse Row"}
            ]
        }
        objResponse = self.client.post(strUrl, dictData, format='json')
        self.assertEqual(objResponse.status_code, status.HTTP_201_CREATED)
        # Check generated items codes: should start at ITM-0001 and ITM-0002
        supplier = Supplier.objects.get(strName="Alpha Supply")
        supplier_items = list(supplier.items.all().order_by('id'))
        self.assertEqual(len(supplier_items), 2)
        self.assertEqual(supplier_items[0].strCode, 'ITM-0001')
        self.assertEqual(supplier_items[1].strCode, 'ITM-0002')

    def test_create_inventory_item_from_supplier_item(self):
        # Section: Verify inventory item creation succeeds if the code is taken from a supplier item
        # Create Category
        category = Category.objects.create(strName="Office Supplies")
        # Create Supplier & SupplierItem
        supplier = Supplier.objects.create(strCode="SUP-001", strName="Test Vendor", strEmail="test@vendor.com")
        s_item = SupplierItem.objects.create(objSupplier=supplier, strCode="ITM-0001", strName="Pen")
        
        strUrl = reverse('item-add')
        dictData = {
            "code": "ITM-0001",
            "name": "Pen",
            "category_name": "Office Supplies",
            "unit": "Box"
        }
        objResponse = self.client.post(strUrl, dictData, format='json')
        self.assertEqual(objResponse.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Item.objects.filter(strCode='ITM-0001').exists())

    def test_create_inventory_item_invalid_code(self):
        # Section: Verify inventory item creation fails if code is NOT a valid supplier item code
        category = Category.objects.create(strName="Office Supplies")
        strUrl = reverse('item-add')
        dictData = {
            "code": "ITM-9999", # Doesn't exist in SupplierItem
            "name": "Ghost Item",
            "category_name": "Office Supplies",
            "unit": "Box"
        }
        objResponse = self.client.post(strUrl, dictData, format='json')
        self.assertEqual(objResponse.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("must be taken from a supplier's catalog", str(objResponse.data['code']))

    def test_create_inventory_item_duplicate_code(self):
        # Section: Verify cannot create a duplicate inventory item
        category = Category.objects.create(strName="Office Supplies")
        supplier = Supplier.objects.create(strCode="SUP-001", strName="Test Vendor", strEmail="test@vendor.com")
        s_item = SupplierItem.objects.create(objSupplier=supplier, strCode="ITM-0001", strName="Pen")
        
        # Pre-create item in inventory
        Item.objects.create(strCode="ITM-0001", strName="Pen", objCategory=category, strUnit="Box")
        
        strUrl = reverse('item-add')
        dictData = {
            "code": "ITM-0001",
            "name": "Pen",
            "category_name": "Office Supplies",
            "unit": "Box"
        }
        objResponse = self.client.post(strUrl, dictData, format='json')
        self.assertEqual(objResponse.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already cataloged in the inventory", str(objResponse.data['code']))

    def test_update_inventory_item_code_fail(self):
        # Section: Verify editing an item's code is not allowed
        category = Category.objects.create(strName="Office Supplies")
        item = Item.objects.create(strCode="ITM-0001", strName="Pen", objCategory=category, strUnit="Box")
        
        strUrl = reverse('item-update', kwargs={"strCode": "ITM-0001"})
        dictData = {
            "code": "ITM-0002",
            "name": "Pen Modified"
        }
        objResponse = self.client.post(strUrl, dictData, format='json')
        self.assertEqual(objResponse.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Item code cannot be edited", str(objResponse.data['code']))
