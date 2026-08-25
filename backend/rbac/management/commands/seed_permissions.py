from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password
from rbac.models import Permission, Role, UserProfile, Branch

# Command to seed permissions, roles, branches and default users in database
class Command(BaseCommand):
    strHelp = 'Seeds the database with permissions, roles, branches, and 10 default test users.'

    def handle(self, *args, **kwargs):
        # Section: Clear existing data
        UserProfile.objects.all().delete()
        Role.objects.all().delete()
        Permission.objects.all().delete()
        Branch.objects.all().delete()
        
        self.stdout.write(self.style.WARNING("Cleared existing users, roles, permissions, and branches."))

        # Section: Define Page-Level Permissions
        listPermissionsData = [
            {"codename": "Dashboard", "name": "Dashboard", "description": "Access to Dashboard overview page"},
            {"codename": "Inventory", "name": "Inventory", "description": "Access to Inventory page"},
            {"codename": "Items", "name": "Items", "description": "Access to Items page"},
            {"codename": "Categories", "name": "Categories", "description": "Access to Categories page"},
            {"codename": "Suppliers", "name": "Suppliers", "description": "Access to Suppliers page"},
            {"codename": "Branches", "name": "Branches", "description": "Access to Branches directory page"},
            {"codename": "Analytics", "name": "Analytics", "description": "Access to Analytics page"},
            {"codename": "Purchase", "name": "Purchase", "description": "Access to Purchase page"},
            {"codename": "Requisition", "name": "Requisition", "description": "Access to Requisition page"},
            {"codename": "Approval", "name": "Approval", "description": "Access to Approval page"},
            {"codename": "Dispatch", "name": "Dispatch", "description": "Access to Dispatch page"},
            {"codename": "Branch Receipt", "name": "Branch Receipt", "description": "Access to Branch Receipt page"},
            {"codename": "Stock Balance", "name": "Stock Balance", "description": "Access to Stock Balance page"},
            {"codename": "Users", "name": "Users", "description": "Access to Users management page"},
            {"codename": "Roles", "name": "Roles", "description": "Access to Roles & Permissions matrix page"},
            {"codename": "Settings", "name": "Settings", "description": "Access to Settings page"},
        ]

        # Save permissions to database
        dictCreatedPerms = {}
        for dictP in listPermissionsData:
            objPerm = Permission.objects.create(
                strCodename=dictP["codename"],
                strName=dictP["name"],
                strDescription=dictP["description"]
            )
            dictCreatedPerms[dictP["codename"]] = objPerm

        self.stdout.write(self.style.SUCCESS(f"Seeded {len(dictCreatedPerms)} permissions."))

        # Section: Define Default Roles & Permissions Mapping
        listRolesData = [
            {
                "name": "Admin",
                "description": "Full system administrative access",
                "permissions": ["Dashboard", "Inventory", "Items", "Categories", "Suppliers", "Branches", "Analytics", "Purchase", "Requisition", "Approval", "Dispatch", "Branch Receipt", "Stock Balance", "Users", "Roles", "Settings"]
            },
            {
                "name": "Stock Manager",
                "description": "Manage inventory, vendors, and branch requests",
                "permissions": ["Dashboard", "Inventory", "Items", "Categories", "Suppliers", "Branches", "Purchase", "Approval", "Dispatch", "Stock Balance"]
            },
            {
                "name": "Branch User",
                "description": "Request items and view local branch transactions",
                "permissions": ["Dashboard", "Requisition", "Branch Receipt"]
            }
        ]

        # Create roles and associate permissions
        dictCreatedRoles = {}
        for dictR in listRolesData:
            objRole = Role.objects.create(
                strName=dictR["name"],
                strDescription=dictR["description"]
            )
            listRolePerms = [dictCreatedPerms[strCodename] for strCodename in dictR["permissions"]]
            objRole.listPermissions.set(listRolePerms)
            dictCreatedRoles[dictR["name"]] = objRole
            self.stdout.write(self.style.SUCCESS(f"Created role: {objRole.strName} with {len(listRolePerms)} permissions."))

        # Section: Seed Branches
        listBranchesData = [
            {"code": "BR-001", "name": "Calicut Branch", "location": "Calicut, Kerala", "contact": "+91 98765 00001", "manager": "Anjali P", "email": "anjali.p@leoinventory.com"},
            {"code": "BR-002", "name": "Kochi Branch", "location": "Kochi, Kerala", "contact": "+91 98765 00002", "manager": "Sajan M", "email": "sajan.m@leoinventory.com"},
            {"code": "BR-003", "name": "Thrissur Branch", "location": "Thrissur, Kerala", "contact": "+91 98765 00003", "manager": "Deepa R", "email": "deepa.r@leoinventory.com"},
        ]

        dictCreatedBranches = {}
        for dictB in listBranchesData:
            objBranch = Branch.objects.create(
                strCode=dictB["code"],
                strName=dictB["name"],
                strLocation=dictB["location"],
                strContact=dictB["contact"],
                strManagerName=dictB["manager"],
                strManagerEmail=dictB["email"]
            )
            dictCreatedBranches[dictB["name"]] = objBranch
            self.stdout.write(self.style.SUCCESS(f"Created branch: {objBranch.strName}"))

        # Section: Seed Default Users (with hashed passwords)
        strDefaultHashedPassword = make_password("password123")
        
        listUsersData = [
            {"name": "System Admin", "username": "admin", "email": "admin@leoinventory.com", "role": "Admin", "status": "Active", "branch": None},
        ]

        for dictU in listUsersData:
            objBranch = dictCreatedBranches.get(dictU["branch"]) if dictU["branch"] else None
            objUser = UserProfile.objects.create(
                strName=dictU["name"],
                strUsername=dictU["username"],
                strEmail=dictU["email"],
                strRoleName=dictU["role"],
                strStatus=dictU["status"],
                strPassword=strDefaultHashedPassword,
                strAvatar=f"https://api.dicebear.com/7.x/adventurer/svg?seed={dictU['username']}",
                objBranch=objBranch
            )
            self.stdout.write(self.style.SUCCESS(f"Created user profile: {objUser.strName} ({objUser.strUsername})"))

        self.stdout.write(self.style.SUCCESS("Database seeding completed successfully!"))
