"""
clsBaseModel.py  -  abstract base every business table inherits.

Provides the standard audit columns so they are defined in ONE place:
  - sin_active      soft-delete flag (1 = active, 0 = deleted). Never hard-delete.
  - fk_created_by   pk_user_id of the creator
  - dat_created     timestamp set on insert
  - fk_modified_by  pk_user_id of the last editor
  - dat_modified    timestamp set on every save

fk_created_by / fk_modified_by are plain integers (not Django FKs) to avoid
circular imports and to match the company's loose-FK convention.
"""
from django.db import models
from django.utils import timezone


class clsBaseModel(models.Model):
    sin_active = models.SmallIntegerField(default=1, db_column='sin_active')
    fk_created_by = models.IntegerField(null=True, blank=True, db_column='fk_created_by')
    dat_created = models.DateTimeField(null=True, blank=True, db_column='dat_created')
    fk_modified_by = models.IntegerField(null=True, blank=True, db_column='fk_modified_by')
    dat_modified = models.DateTimeField(null=True, blank=True, db_column='dat_modified')

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        objNow = timezone.now()
        if not self.dat_created:
            self.dat_created = objNow
        self.dat_modified = objNow
        super().save(*args, **kwargs)
