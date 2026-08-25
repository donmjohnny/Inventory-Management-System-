"""
Operational table: User  ->  tbl_user

The SOLE authentication source for the application. Login is handled against
this table (see inventory/Views/User/userViews.py + inventory/Lib/clsAuth.py);
Django's auth User model is NOT used.

Password storage uses django.contrib.auth.hashers (make_password /
check_password) -- stand-alone PBKDF2 utilities that do not pull in Django's
auth login machinery.
"""
from django.contrib.auth.hashers import make_password, check_password
from django.db import models

from inventory.Lib.clsBaseModel import clsBaseModel


class TblUser(clsBaseModel):
    pk_user_id = models.AutoField(primary_key=True, db_column='pk_user_id')

    vhr_user_name = models.CharField(max_length=100, unique=True, db_column='vhr_user_name')
    vhr_display_name = models.CharField(max_length=120, blank=True, default='', db_column='vhr_display_name')

    # PBKDF2 hash. Never store the plain password. Set via fnSetPassword().
    vhr_password = models.CharField(max_length=255, blank=True, default='', db_column='vhr_password')

    # 1 = Admin, 2 = Stock Manager, 3 = Branch User  (see settings.USER_ROLE)
    sin_user_type = models.SmallIntegerField(default=3, db_column='sin_user_type')

    # branch a Branch User belongs to (null for Admin / Central staff).
    # Loose FK to tbm_location (built later); kept as integer per convention.
    fk_location_id = models.IntegerField(null=True, blank=True, db_column='fk_location_id')

    dat_last_login = models.DateTimeField(null=True, blank=True, db_column='dat_last_login')

    class Meta:
        app_label = 'inventory'
        db_table = 'tbl_user'
        verbose_name = 'User'

    def __str__(self):
        return self.vhr_display_name or self.vhr_user_name

    # --- password helpers ---------------------------------------------------
    def fnSetPassword(self, strRawPassword):
        """Hash and store a new password. Caller must save()."""
        self.vhr_password = make_password(strRawPassword)

    def fnCheckPassword(self, strRawPassword):
        """True when the supplied plain password matches the stored hash."""
        if not self.vhr_password:
            return False
        return check_password(strRawPassword, self.vhr_password)
