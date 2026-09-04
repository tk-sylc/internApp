# Asset Desk

React + Vite と Django REST Framework + SQLite で構成した、社内資産申請ポータルです。

## 主な機能

- Djangoセッションによるログイン・ログアウト
- 会社メール限定のアカウント作成
- 期限付き・一回限りのメール確認リンクと再送
- Django標準トークンを使ったパスワード再設定
- 初回ログイン時の氏名・部署登録
- プロフィールから申請者情報を自動設定
- PC、外部記憶装置、LAN機器、スマートフォンの申請
- 入力検証、確認画面、下書き、二重送信・タイムアウト対策
- 管理画面での検索、絞り込み、状態更新
- CSRF保護と認証操作の簡易レート制限

社員番号は使用しません。申請時の氏名・部署・メールアドレスは、Reactから送られた値ではなく、ログイン中のDjangoユーザーとプロフィールからサーバーが保存します。

## ディレクトリ構成

- `src/`: Reactフロントエンド
- `django-project/config/`: Djangoプロジェクト設定
- `django-project/accounts/`: 認証・プロフィール・メール確認API
- `django-project/asset_requests/`: 申請モデル・API・管理画面・テスト
- `django-project/db.sqlite3`: ローカル開発DB（Git管理対象外）

バックエンドは `django-project/` が唯一の正式な実装です。

## 初回セットアップ

PowerShellでバックエンドを準備します。

```powershell
cd django-project
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py createsuperuser
```

プロジェクトルートでフロントエンドを準備します。

```powershell
npm.cmd install
```

## ローカル環境の設定

アカウント作成を有効にするには、Djangoを起動するPowerShellで会社メールのドメインを設定します。未設定の場合、新規登録は安全のため無効になります。

```powershell
$env:COMPANY_EMAIL_DOMAINS = "your-company.co.jp"
$env:FRONTEND_BASE_URL = "http://127.0.0.1:5173"
```

複数ドメインを許可する場合はカンマで区切ります。ドメインは完全一致で判定され、未登録のサブドメインは許可されません。

```powershell
$env:COMPANY_EMAIL_DOMAINS = "your-company.co.jp,group-company.co.jp"
```

## 開発サーバーの起動

1つ目のPowerShellでDjangoを起動します。

```powershell
cd django-project
.\.venv\Scripts\python.exe manage.py runserver
```

2つ目のPowerShellでReactを起動します。

```powershell
npm.cmd run dev
```

- 申請画面: <http://127.0.0.1:5173/>
- Django管理画面: <http://127.0.0.1:8000/admin/>

Djangoの `/` には画面を割り当てていないため、`http://127.0.0.1:8000/` の404は正常です。

## アカウント作成の確認方法

開発環境ではメール本文がDjangoを起動したPowerShellへ表示されます。

1. Reactのログイン画面で「アカウントを作成」を選ぶ
2. 許可された会社メールとパスワードを入力する
3. Django側のPowerShellに表示された `/#/verify-email?...` のURLを開く
4. 「メールアドレスを確認」を押す
5. ログイン後、氏名と部署を登録する

以後の申請では登録した氏名と部署が自動表示されます。

パスワードを忘れた場合は、ログイン画面の「パスワードを忘れた方」から同様にPowerShellへ表示されたリンクを開きます。同じメールアドレスで別アカウントを再作成することはできません。

## API

Viteは `/api` を `http://127.0.0.1:8000` へ転送します。

| メソッド | URL | 用途 |
| --- | --- | --- |
| `GET` | `/api/auth/session/` | セッション復元とCSRF Cookie発行 |
| `POST` | `/api/auth/login/` | ログイン |
| `POST` | `/api/auth/logout/` | ログアウト |
| `GET`, `PUT` | `/api/auth/profile/` | 本人プロフィールの取得・保存 |
| `POST` | `/api/auth/register/` | 会社メールでアカウント作成 |
| `POST` | `/api/auth/email-verification/confirm/` | メールアドレス確認 |
| `POST` | `/api/auth/email-verification/resend/` | 確認メール再送 |
| `POST` | `/api/auth/password-reset/` | パスワード再設定メール送信 |
| `POST` | `/api/auth/password-reset/confirm/` | 新しいパスワードの保存 |
| `POST` | `/api/pc-requests/` | PC貸出申請 |
| `POST` | `/api/external-storage-requests/` | 外部記憶装置貸出申請 |
| `POST` | `/api/lan-requests/` | LAN機器貸出申請 |
| `POST` | `/api/smartphone-requests/` | スマートフォン購入申請 |

すべての更新系APIはCSRFトークンを検証します。メール確認はリンクを開くだけでは実行されず、確認画面からのPOSTで確定します。

## 本番メール設定

ローカルのconsole mailerは開発専用です。本番ではSMTPまたは利用するメールサービスに合わせて設定してください。たとえばAmazon SESのSMTP資格情報を使う場合は、実際の値を環境変数またはシークレット管理サービスから渡します。

```powershell
$env:DJANGO_MAILER_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
$env:SMTP_HOST = "SMTPホスト名"
$env:SMTP_PORT = "587"
$env:SMTP_USERNAME = "SMTPユーザー名"
$env:SMTP_PASSWORD = "SMTPパスワード"
$env:SMTP_USE_TLS = "true"
$env:DEFAULT_FROM_EMAIL = "Asset Desk <no-reply@your-company.co.jp>"
```

本番ではさらに、固定の `DJANGO_SECRET_KEY`、HTTPS、`DEBUG=False`、Secure Cookie、共有キャッシュ、AWS WAFなどのレート制御を設定してください。現在のLocMemキャッシュによる制限は、単一プロセスの開発環境向けです。

## 管理と復旧

- 確認済みアカウントを管理画面で停止する場合は、Userの `is_active` をオフにします。
- 確認済みユーザーの古い確認リンクでは、停止済みアカウントを再有効化できません。
- 停止済みアカウントの復旧は管理者が行います。
- 既存の管理者ユーザーにメールアドレスが未登録の場合、パスワード再設定メールは送信されません。

## テスト

```powershell
cd django-project
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py test accounts asset_requests
```

```powershell
cd ..
npm.cmd run lint
npm.cmd run build
```

今回のDB変更前のローカルバックアップは `django-project/db.before-auth-migration.sqlite3` です。Git管理対象外にしておき、不要になった段階で手動削除してください。
