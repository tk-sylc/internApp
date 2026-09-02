# Django backend

## Start the development server

Open a new PowerShell terminal, then run:

```powershell
cd django-project
.\.venv\Scripts\python.exe manage.py runserver
```

The development server will be available at <http://127.0.0.1:8000/>.

Stop it with `Ctrl+C`.

## Recreate the environment

```powershell
cd django-project
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe manage.py migrate
```

To use `py manage.py runserver` instead, activate the virtual environment for
the current PowerShell session first:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\.venv\Scripts\Activate.ps1
py manage.py runserver
```
