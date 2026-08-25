# leoInventory — General Inventory Management System

Django 3.2 · PostgreSQL · single app (`inventory`) · HTML/JS/jQuery/DataTables.

A scaffold for a general inventory system: stock is **purchased at a Central
Office** and distributed to **branches** through a request → approval → dispatch
→ receipt workflow, with full movement history and reporting.

This package ships:
- the framework, conventions and database wiring,
- a complete **login / User** module (authenticates against `tbl_user`, no
  Django admin / auth login),
- one fully-worked master module — **Item** — to copy for every other module,
- two documents: `REQUIREMENTS_DOCUMENT.docx` and `TECHNICAL_DOCUMENT.docx`.

Everything else (Purchase, Requisition, Approval, Stock Movement, Branch Receipt,
Stock balances, Reports) is specified in detail in the Technical Document and is
to be built by following the Item pattern.

---

## Run it (PostgreSQL only — no virtualenv needed)

**1. Create the database.** In psql (`psql -U postgres`, or
`sudo -u postgres psql` on Ubuntu):

```sql
CREATE DATABASE leo_inventory;
-- default config uses the 'postgres' user; for a dedicated user instead:
-- CREATE USER leo_user WITH PASSWORD 'your_password';
-- GRANT ALL PRIVILEGES ON DATABASE leo_inventory TO leo_user;
-- \c leo_inventory
-- GRANT ALL ON SCHEMA public TO leo_user;   -- PostgreSQL 15+
```

**2. Set credentials** in `leoInventory/settings.py` → `DATABASES['default']`
(`NAME` / `USER` / `PASSWORD` / `HOST` / `PORT`). Defaults:
`leo_inventory` / `postgres` / `admin2024` / `127.0.0.1` / `5432`.

**3. Install, migrate, create a login, run:**

```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py create_app_user --username admin --type 1   # prompts for password
python manage.py runserver
```

**4. Open** http://127.0.0.1:8000/ — you'll be sent to the login page. Sign in
with the admin account you just created. The home page links to the **Item** and
**User** screens.

---

## Notes

- **Login is against `tbl_user`.** There is no `/admin/` site and no
  `createsuperuser`. Create or reset logins with `create_app_user`
  (re-running for an existing username resets that user's password).
- **Roles:** `--type 1` Admin, `2` Stock Manager, `3` Branch User.
- **No virtualenv assumed** — dependencies install into your Python and you run
  `manage.py` directly. (A venv still works if you prefer one.)
- **Soft delete:** records are hidden (`sin_active = 0`), never erased.

## Where to read next

| File | What it is |
|------|------------|
| `REQUIREMENTS_DOCUMENT.docx` | What the system must do (functional/business requirements) |
| `TECHNICAL_DOCUMENT.docx` | How it's built — architecture, conventions, every module in detail, how to add a module |

## Layout (summary)

```
leoInventory/                project package (settings, urls, wsgi)
inventory/                   the single app
  Lib/                       clsBaseModel, clsResponse, clsDataTable, clsAuth
  Model/<Entity>/            one model file per entity
  Views/<Entity>/            <entity>Views.py + <entity>Operation.py + <entity>Print.py
  templates/<Entity>/        <entity>.html
  static/<Entity>/           <entity>.js
  management/commands/       create_app_user
```

See the Technical Document, section 8, for the step-by-step recipe to add a new
module by copying **Item**.
