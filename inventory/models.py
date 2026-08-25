"""
models.py  -  AGGREGATOR.

Django auto-discovers models only in each app's top-level models.py. Because the
real model files live under Model/<Entity>/<entity>Model.py, this file imports
every model so Django (and makemigrations) can see them.

*** When you add a new model, add its import here, or it will be ignored. ***
"""
from inventory.Model.User.userModel import TblUser
from inventory.Model.Item.itemModel import TbmItem

__all__ = ['TblUser', 'TbmItem']
