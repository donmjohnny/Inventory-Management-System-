"""
Master table: Item  ->  tbm_item

The worked-example module. Items are the things the business stocks and moves
between the Central Office and branches (e.g. Bundle of Books, Pens, A4 Paper,
Printer Ink).

Kept deliberately self-contained for the scaffold: category and unit are stored
as plain text. When the Category and Unit master modules are built (see the
Technical Document), these become fk_category_id / fk_unit_id foreign keys.
"""
from django.db import models

from inventory.Lib.clsBaseModel import clsBaseModel


class TbmItem(clsBaseModel):
    pk_item_id = models.AutoField(primary_key=True, db_column='pk_item_id')

    vhr_item_code = models.CharField(max_length=30, unique=True, db_column='vhr_item_code')
    vhr_item_name = models.CharField(max_length=180, db_column='vhr_item_name')

    # plain text for now (future: fk_category_id -> tbm_category)
    vhr_category = models.CharField(max_length=80, blank=True, default='', db_column='vhr_category')
    # plain text for now (future: fk_unit_id -> tbm_unit), e.g. PCS, BOX, REAM
    vhr_unit = models.CharField(max_length=20, blank=True, default='', db_column='vhr_unit')

    dbl_reorder_level = models.DecimalField(
        max_digits=14, decimal_places=3, default=0, db_column='dbl_reorder_level')
    dbl_standard_cost = models.DecimalField(
        max_digits=14, decimal_places=2, default=0, db_column='dbl_standard_cost')

    class Meta:
        app_label = 'inventory'
        db_table = 'tbm_item'
        verbose_name = 'Item'

    def __str__(self):
        return f'{self.vhr_item_code} - {self.vhr_item_name}'
