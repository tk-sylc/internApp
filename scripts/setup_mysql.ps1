[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $repositoryRoot 'backend'
$setupLog = Join-Path $repositoryRoot 'mysql-setup.log'
$baseDirectory = 'C:\Program Files\MySQL\MySQL Server 8.4'
$programDataDirectory = 'C:\ProgramData\MySQL\MySQL Server 8.4'
$dataDirectory = Join-Path $programDataDirectory 'Data'
$uploadsDirectory = Join-Path $programDataDirectory 'Uploads'
$configPath = Join-Path $programDataDirectory 'my.ini'
$mysqld = Join-Path $baseDirectory 'bin\mysqld.exe'
$mysql = Join-Path $baseDirectory 'bin\mysql.exe'
$python = Join-Path $backendRoot '.venv\Scripts\python.exe'
$serviceName = 'MySQL84'
$rootAccountSecured = $false

Start-Transcript -LiteralPath $setupLog -Force | Out-Null

try {
    if (-not (Test-Path -LiteralPath $mysqld -PathType Leaf)) {
        throw "MySQL Server was not found: $mysqld"
    }
    if (-not (Test-Path -LiteralPath $python -PathType Leaf)) {
        throw "The backend virtual environment was not found: $python"
    }
    if (Get-Service -Name $serviceName -ErrorAction SilentlyContinue) {
        throw "$serviceName is already configured."
    }
    if (Test-Path -LiteralPath $dataDirectory) {
        throw "The MySQL data directory already exists: $dataDirectory"
    }

    New-Item -ItemType Directory -Path $programDataDirectory -Force | Out-Null
    New-Item -ItemType Directory -Path $uploadsDirectory -Force | Out-Null

    $config = @"
[client]
port=3306
default-character-set=utf8mb4

[mysqld]
basedir=C:/Program Files/MySQL/MySQL Server 8.4
datadir=C:/ProgramData/MySQL/MySQL Server 8.4/Data
port=3306
bind-address=127.0.0.1
character-set-server=utf8mb4
collation-server=utf8mb4_unicode_ci
secure-file-priv=C:/ProgramData/MySQL/MySQL Server 8.4/Uploads
mysqlx=0
"@
    [System.IO.File]::WriteAllText(
        $configPath,
        $config,
        [System.Text.UTF8Encoding]::new($false)
    )

    Write-Output 'Initializing MySQL data directory...'
    & $mysqld "--defaults-file=$configPath" --initialize-insecure --console
    if ($LASTEXITCODE -ne 0) {
        throw "MySQL initialization failed with exit code $LASTEXITCODE."
    }

    Write-Output 'Registering the MySQL84 Windows service...'
    & $mysqld --install $serviceName "--defaults-file=$configPath"
    if ($LASTEXITCODE -ne 0) {
        throw "Service registration failed with exit code $LASTEXITCODE."
    }

    Start-Service -Name $serviceName
    $deadline = (Get-Date).AddSeconds(30)
    do {
        Start-Sleep -Milliseconds 500
        $serviceStatus = (Get-Service -Name $serviceName).Status
    } until ($serviceStatus -eq 'Running' -or (Get-Date) -ge $deadline)
    if ($serviceStatus -ne 'Running') {
        throw 'MySQL84 did not enter the Running state.'
    }

    $rootPassword = 'Aa1!' + [guid]::NewGuid().ToString('N')
    $appPassword = 'Aa1!' + [guid]::NewGuid().ToString('N')
    $sql = @"
ALTER USER 'root'@'localhost' IDENTIFIED BY '$rootPassword';
CREATE DATABASE intern_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'intern_app'@'localhost' IDENTIFIED BY '$appPassword';
CREATE USER 'intern_app'@'127.0.0.1' IDENTIFIED BY '$appPassword';
GRANT ALL PRIVILEGES ON intern_app.* TO 'intern_app'@'localhost';
GRANT ALL PRIVILEGES ON intern_app.* TO 'intern_app'@'127.0.0.1';
FLUSH PRIVILEGES;
"@
    $sql | & $mysql --protocol=TCP --host=127.0.0.1 --user=root --skip-password
    if ($LASTEXITCODE -ne 0) {
        Stop-Service -Name $serviceName -ErrorAction SilentlyContinue
        throw 'Account setup failed. MySQL84 was stopped to protect the blank root account.'
    }
    $rootAccountSecured = $true

    $environmentValues = @{
        DATABASE_ENGINE = 'mysql'
        MYSQL_DATABASE = 'intern_app'
        MYSQL_USER = 'intern_app'
        MYSQL_PASSWORD = $appPassword
        MYSQL_HOST = '127.0.0.1'
        MYSQL_PORT = '3306'
        INTERNAPP_MYSQL_ROOT_PASSWORD = $rootPassword
    }
    foreach ($entry in $environmentValues.GetEnumerator()) {
        [Environment]::SetEnvironmentVariable(
            $entry.Key,
            $entry.Value,
            [EnvironmentVariableTarget]::User
        )
        [Environment]::SetEnvironmentVariable(
            $entry.Key,
            $entry.Value,
            [EnvironmentVariableTarget]::Process
        )
    }

    Write-Output 'Applying Django migrations to MySQL...'
    & $python (Join-Path $backendRoot 'manage.py') migrate
    if ($LASTEXITCODE -ne 0) {
        throw "Django migration failed with exit code $LASTEXITCODE."
    }

    $fixture = Join-Path $backendRoot 'sqlite-data.json'
    if (Test-Path -LiteralPath $fixture -PathType Leaf) {
        $fixtureBytes = [System.IO.File]::ReadAllBytes($fixture)
        try {
            $strictUtf8 = [System.Text.UTF8Encoding]::new($false, $true)
            $null = $strictUtf8.GetString($fixtureBytes)
        }
        catch [System.Text.DecoderFallbackException] {
            Write-Output 'Converting the SQLite fixture from Windows encoding to UTF-8...'
            $windowsEncoding = [System.Text.Encoding]::GetEncoding(932)
            $fixtureText = $windowsEncoding.GetString($fixtureBytes)
            [System.IO.File]::WriteAllText(
                $fixture,
                $fixtureText,
                [System.Text.UTF8Encoding]::new($false)
            )
        }
        Write-Output 'Importing the preserved SQLite data...'
        & $python (Join-Path $backendRoot 'manage.py') loaddata $fixture
        if ($LASTEXITCODE -ne 0) {
            throw "SQLite data import failed with exit code $LASTEXITCODE."
        }
    }

    Write-Output 'MYSQL_SETUP_COMPLETE=true'
}
catch {
    if (-not $rootAccountSecured) {
        Stop-Service -Name $serviceName -ErrorAction SilentlyContinue
    }
    Write-Error $_
    exit 1
}
finally {
    Stop-Transcript | Out-Null
}
