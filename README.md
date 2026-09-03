# Asset Desk

React + Vite の申請画面と、Django REST Framework + SQLite のバックエンドで構成した社内資産申請ポータルです。

## 主な機能

- Djangoユーザーによるセッションログイン・ログアウト
- PC、外部記憶装置、LAN機器、スマートフォンの申請
- 入力検証、確認画面、二重送信・タイムアウト対策
- ログインユーザーごとの一時下書き保存
- 受付番号、申請状態、受付日時の表示
- 管理画面での検索、絞り込み、状態更新、作成ユーザー確認
- CSRF保護と未ログイン時のAPI拒否

## ディレクトリ構成

- `src/`: Reactフロントエンド
- `django-project/config/`: Djangoプロジェクト設定
- `django-project/accounts/`: ログイン、ログアウト、セッション確認API
- `django-project/asset_requests/`: 申請モデル、API、管理画面、テスト
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

Djangoの `/` は画面を割り当てていないため、`http://127.0.0.1:8000/` の404は正常です。

## ReactとDjangoの接続

Viteは `/api` を `http://127.0.0.1:8000` へ転送します。Reactは次の相対URLを利用します。

| メソッド | URL | 用途 |
| --- | --- | --- |
| `GET` | `/api/auth/session/` | ログイン状態の復元とCSRF Cookieの準備 |
| `POST` | `/api/auth/login/` | Djangoユーザーでログイン |
| `POST` | `/api/auth/logout/` | ログアウト |
| `POST` | `/api/pc-requests/` | PC貸出申請 |
| `POST` | `/api/external-storage-requests/` | 外部記憶装置貸出申請 |
| `POST` | `/api/lan-requests/` | LAN機器貸出申請 |
| `POST` | `/api/smartphone-requests/` | スマートフォン購入申請 |

申請APIはセッション認証が必須です。POSTの直前に最新の `csrftoken` Cookieを読み、`X-CSRFToken` ヘッダーへ設定します。

## データと管理画面

各申請には、入力された申請者情報に加えて、実際に送信したDjangoユーザーを `created_by` として記録します。管理画面では受付番号やユーザー名で検索でき、申請状態を「申請中」「承認」「却下」へ変更できます。

既存のSQLiteデータはGitでは共有されません。別実装のDBからデータを移す場合は、モデル項目が異なるため専用のデータ移行が必要です。

## テスト

```powershell
cd django-project
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
.\.venv\Scripts\python.exe manage.py test accounts asset_requests
```

```powershell
cd ..
npm.cmd run lint
npm.cmd run build
```

この構成は開発用です。本番公開時は `DEBUG`、`SECRET_KEY`、`ALLOWED_HOSTS`、HTTPS、Cookie、データベース、配信サーバーの設定を環境別に行ってください。
