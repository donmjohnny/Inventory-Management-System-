"""
create_app_user  -  seed a tbl_user login (replaces Django's createsuperuser).

Usage:
    python manage.py create_app_user --username admin --password secret --type 1
    python manage.py create_app_user --username admin              # prompts for password

The app authenticates against tbl_user, so this is how the first login is made.
Re-running for an existing username updates that user's password (a reset).
"""
from getpass import getpass

from django.core.management.base import BaseCommand, CommandError

from inventory.Model.User.userModel import TblUser


class Command(BaseCommand):
    help = 'Create (or reset the password of) an application user in tbl_user.'

    def add_arguments(self, parser):
        parser.add_argument('--username', required=True)
        parser.add_argument('--password', default='')
        parser.add_argument('--display', default='', help='Display name')
        parser.add_argument('--type', type=int, default=1,
                            help='1=Admin 2=Stock Manager 3=Branch User (default 1)')

    def handle(self, *args, **options):
        strUserName = options['username'].strip()
        strPassword = options['password']
        if not strPassword:
            strPassword = getpass('Password: ')
            if strPassword != getpass('Password (again): '):
                raise CommandError('Passwords did not match.')
        if len(strPassword) < 6:
            raise CommandError('Password must be at least 6 characters.')

        objUser, blnCreated = TblUser.objects.get_or_create(
            vhr_user_name=strUserName,
            defaults={'sin_user_type': options['type']})
        objUser.vhr_display_name = options['display'] or objUser.vhr_display_name or strUserName
        objUser.sin_user_type = options['type']
        objUser.sin_active = 1
        objUser.fnSetPassword(strPassword)
        objUser.save()

        strVerb = 'Created' if blnCreated else 'Updated'
        self.stdout.write(self.style.SUCCESS(
            f'{strVerb} user "{strUserName}" (type {options["type"]}).'))
