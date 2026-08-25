#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys
import subprocess


def main():
    # If the backend directory exists, transparently delegate to it using its own venv/manage.py.
    # This ensures running `python manage.py runserver` from the root starts the correct API backend.
    backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend')
    backend_manage = os.path.join(backend_dir, 'manage.py')
    
    backend_python = None
    for venv_name in ['venv', '.venv']:
        py_path = os.path.join(backend_dir, venv_name, 'Scripts', 'python.exe')
        if os.path.exists(py_path):
            backend_python = py_path
            break

    if backend_python and os.path.exists(backend_manage):
        cmd = [backend_python, backend_manage] + sys.argv[1:]
        sys.exit(subprocess.call(cmd))

    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'leoInventory.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to install Django (pip install Django==3.2)?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
