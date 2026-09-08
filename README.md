# 社内機器管理（internApp）

承認済みの機器に関する手続きを担当者が登録し、Excel台帳へ反映する社内向けアプリです。Excelへの転記作業を減らし、登録内容の確認・修正・取消と、その変更履歴の確認をアプリ上で行えます。

## 目次

- [目的と業務の流れ](#目的と業務の流れ)
- [対象業務と入力内容](#対象業務と入力内容)
- [利用者と画面の役割](#利用者と画面の役割)
- [主な機能と使い方](#主な機能と使い方)
- [データとExcelの扱い](#データとexcelの扱い)
- [システム構成](#システム構成)
- [開発環境のセットアップ](#開発環境のセットアップ)
- [アカウントとメールの設定](#アカウントとメールの設定)
- [AWSでの運用](#awsでの運用)
- [主なAPI](#主なapi)
- [開発時の確認](#開発時の確認)

## 目的と業務の流れ

このアプリは、承認済みの申請内容を台帳へ記録する作業を担当します。社員からの申請受付と上司による承認は、社内の業務手順に沿ってアプリの外で行います。

```text
社員が申請 → 上司が承認 → 担当者がアプリへ登録 → Excel台帳へ反映
                                  ↓
                         台帳の確認・修正・取消
                                  ↓
                         変更履歴の保存・Excel更新
```

1件の登録は、1回の購入・貸出・返却・廃棄の処理を表します。担当者は承認済みの申請書などを確認しながら必要な情報を入力します。

## 対象業務と入力内容

### 処理区分

| 処理 | 記録する内容 | 処理に応じた主な入力項目 |
| --- | --- | --- |
| 購入 | 機器の購入 | 数量、利用開始日・終了日、目的、利用場所 |
| 貸出 | 保有機器の貸出 | 管理番号、数量、利用開始日・終了日、目的、利用場所 |
| 返却 | 貸し出した機器の返却 | 管理番号、利用終了日、返却時の状態、利用場所 |
| 廃棄 | 機器の廃棄 | 管理番号、廃棄日、廃棄理由、廃棄方法、利用場所 |

### 機器種別

| 機器 | 主な入力項目 |
| --- | --- |
| PC | 機種名、CPU、RAM、OS・バージョン、各種ソフトウェアのバージョン、セキュリティソフト、ウイルス対策ソフト導入確認 |
| スマートフォン | 機種名、容量、電話番号、キャリア名、OS・バージョン、セキュリティソフト、ウイルス対策ソフト導入確認 |
| LAN機器 | 機器種別、機器名、入手方法、借用元、暗号方式 |
| 外部記憶装置 | 種類、機器名、容量、暗号化ソフト、ウイルスチェック、ウイルスパターンファイル |

各フォームには、申請者氏名・所属部署・担当者メモもあります。部署は「営業部・総務部・システム部」から選択します。

登録時に必須なのは処理区分と機器種別です。それ以外の項目は任意で、分かる範囲を入力できます。登録責任者はログインアカウントから自動設定されます。

新規登録画面では上記4種別を選択します。台帳画面では、この4種別に加えて「その他」に分類された登録も閲覧・修正・出力できます。

## 利用者と画面の役割

| 利用者 | 使用する画面 | できること |
| --- | --- | --- |
| 担当者 | Reactのメイン画面 | 登録、台帳全体の閲覧、検索、詳細・履歴の確認、修正、取消・復元、Excelの取得、同期の再試行 |
| 管理者 | メイン画面とDjango管理画面 | 担当者と同じ業務操作に加え、アカウント招待、利用停止、権限管理、管理画面での台帳参照 |

有効な担当者アカウントは、他の担当者が登録した内容も閲覧・修正・取消・復元できます。日常業務にスタッフ権限は不要です。

Django管理画面の台帳は参照専用です。管理者も登録内容の変更はメイン画面で行い、変更履歴の記録と同時編集の確認を通します。管理画面へ入るには、スタッフ権限と操作対象に応じた権限が必要です。

## 主な機能と使い方

### 登録する

1. 会社メールアドレスとパスワードでログインします。
2. 「購入・貸出・返却・廃棄」から処理を選びます。
3. 機器種別を選び、申請書などを見ながら必要な項目を入力します。
4. 確認画面で内容を確認し、登録します。
5. 登録結果とExcelへの反映状態を確認します。

保存時に受付番号と登録日時を記録し、機器種別に対応するExcel台帳を更新します。

### 台帳全体を確認する

「台帳を確認」から機器種別を選ぶと、Excelと同じ列構成の表を閲覧できます。検索していない状態では、その種別の有効な登録を全件表示します。列数が多い場合は横へスクロールして確認します。

検索で表示を絞り込むこともできます。各登録の詳細を開くと、入力内容・登録責任者・登録日時・変更履歴を確認できます。

### 登録内容を修正する

登録の詳細画面で「修正する」を選び、内容を変更して保存します。他の担当者が登録した内容も修正できます。

別の担当者が同じ登録を先に更新していた場合は、上書きを防ぐため保存を停止します。「最新内容を読み直す」から最新の登録を確認し、必要な修正を行ってください。

### 誤登録を取り消す・復元する

二重登録などは、修正画面の「誤登録の取消」から理由を入力して取り消します。取消理由は必須です。

取消した登録は、通常の台帳とExcel出力から除外されます。登録内容と履歴は保持され、「取消済みも表示」から確認・復元できます。

「取消」は誤って登録した記録を無効にする操作です。実際に機器を処分したことを記録する「廃棄」とは用途が異なります。

### 変更履歴を確認する

登録・修正・取消・復元の操作ごとに、次の情報を保存します。

- 操作した担当者の氏名・メールアドレス
- 操作日時と操作の種類
- 変更した項目と変更前・変更後の内容
- 取消時の理由

最初の登録責任者と登録日時は、修正後も変わりません。担当者の氏名・メールアドレスは操作時点の値を保存します。履歴はアプリから編集・削除できません。

## データとExcelの扱い

### データの保存先

登録内容・登録責任者・変更履歴・同期状態はMySQLに保存します。データベースを基準として、アプリが機器種別ごとのExcelファイルを生成します。

```text
アプリで登録・修正・取消・復元
  → データベースに内容と履歴を保存
  → Excel台帳を生成・更新
  → アプリで閲覧、必要に応じてダウンロード
```

Excelとの連携は、アプリからExcelへの一方向です。ダウンロードしたExcelを直接編集しても、アプリには反映されません。

### Excelの閲覧・ダウンロード

- 台帳画面は、Excelへ出力する項目と登録内容を表形式で表示します。
- Excelダウンロードは、検索条件や取消済みの表示設定に関係なく、選択した種別の有効な登録を全件出力します。
- ダウンロード時に最新のExcelを生成します。生成に失敗した場合、古いファイルは配布しません。
- パソコンへダウンロード済みのファイルは自動更新されません。修正・取消後は最新のExcelを取得してください。

Excelの保存先は、標準設定では `backend/approved_ledgers/` です。保存先は環境変数 `APPROVED_LEDGER_OUTPUT_DIR` で変更できます。Excelやデータベースの内容はGit管理の対象外です。

### 同期に失敗した場合

データベースへの保存とExcelへの書き込みは、別の処理として扱います。Excelへの反映に失敗しても、保存済みの登録内容と履歴は残ります。

台帳画面で「Excelに未反映の内容があります」と表示された場合は、保存内容を確認してから「同期を再試行」を実行します。同じ内容を再登録する必要はありません。

## システム構成

| 要素 | 使用技術 | 役割 |
| --- | --- | --- |
| フロントエンド | React、Vite | 担当者向けの入力・台帳・履歴画面 |
| バックエンド | Django、Django REST Framework | セッション認証、登録処理、履歴管理、API |
| データベース | MySQL | アカウント、登録内容、履歴、同期状態の保存 |
| Excel生成 | openpyxl | 機器種別ごとの `.xlsx` ファイルの生成 |
| AWS実行環境 | EC2、Ubuntu、Gunicorn、Nginx、systemd | アプリの実行、画面・APIの配信、プロセス管理 |

### ディレクトリ構成

```text
internApp/
├─ src/                         # Reactの画面とAPI呼び出し
│  ├─ App.jsx                   # ログイン、ホーム、登録フォーム
│  ├─ LedgerWorkspace.jsx       # 台帳、詳細、修正、取消、履歴
│  └─ formConfig.js             # 処理区分、機器種別、入力項目
├─ backend/
│  ├─ accounts/                 # アカウント招待、認証、プロフィール
│  ├─ asset_requests/           # 台帳データ、変更履歴、Excel連携
│  ├─ config/                   # Django設定とURL定義
│  ├─ approved_ledgers/         # 生成したExcel（Git管理外）
│  └─ requirements.txt          # Pythonの依存ライブラリ
├─ docs/                        # 運用手順
├─ scripts/                     # 環境構築用スクリプト
├─ package.json                 # フロントエンドの依存関係とコマンド
└─ vite.config.js               # 開発サーバーとAPI転送の設定
```

## 開発環境のセットアップ

以下はWindowsのPowerShellで、リポジトリのルートフォルダから作業する手順です。

### 必要なもの

- Python 3.12以降
- Node.js 24系とnpm
- MySQL Server 8.4
- Git

Pythonの依存バージョンは [backend/requirements.txt](backend/requirements.txt)、フロントエンドの依存関係は [package.json](package.json) と `package-lock.json` で管理しています。

### 1. データベースを準備する

MySQLに管理者として接続し、開発用データベースとアプリ専用ユーザーを作成します。パスワードの例は、自分で決めた値へ置き換えてください。

```sql
CREATE DATABASE intern_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'intern_app'@'localhost' IDENTIFIED BY 'アプリ専用のMySQLパスワード';
GRANT ALL PRIVILEGES ON intern_app.* TO 'intern_app'@'localhost';
```

すでにデータベースとユーザーがある場合は、その接続情報を使います。

### 2. バックエンドを準備する

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt

$env:DATABASE_ENGINE = "mysql"
$env:MYSQL_DATABASE = "intern_app"
$env:MYSQL_USER = "intern_app"
$env:MYSQL_PASSWORD = "アプリ専用のMySQLパスワード"
$env:MYSQL_HOST = "127.0.0.1"
$env:MYSQL_PORT = "3306"
$env:COMPANY_EMAIL_DOMAINS = "example.co.jp"
$env:FRONTEND_BASE_URL = "http://127.0.0.1:5173"

.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py createsuperuser
.\.venv\Scripts\python.exe manage.py sync_approved_ledgers
```

`example.co.jp` は実際に招待を許可する会社ドメインに置き換えます。複数の場合はカンマで区切ります。

`createsuperuser` では、内部管理用ユーザー名・メールアドレス・パスワードを設定します。ログインに使うのはメールアドレスとパスワードです。`sync_approved_ledgers` は、登録内容に対応するExcel台帳を生成します。

`.venv` は、このアプリ専用のPython環境です。上記のように `.venv` 内のPythonを指定すれば、仮想環境の有効化操作を省略できます。

### 3. フロントエンドを準備する

別のPowerShellをリポジトリのルートフォルダで開き、実行します。

```powershell
npm.cmd ci
```

### 4. アプリを起動する

バックエンドを準備したPowerShellで、`backend/` から実行します。

```powershell
.\.venv\Scripts\python.exe manage.py runserver
```

フロントエンドを準備したPowerShellで、リポジトリのルートフォルダから実行します。

```powershell
npm.cmd run dev
```

| 画面 | 開発用URL |
| --- | --- |
| メイン画面 | <http://127.0.0.1:5173/> |
| Django管理画面 | <http://127.0.0.1:8000/admin/> |

Viteが `/api/` へのアクセスをDjangoの `127.0.0.1:8000` へ転送します。DjangoのルートURL `/` にはReactの画面はありません。終了するときは、各ターミナルで `Ctrl+C` を押します。

`$env:` で設定した値は、そのPowerShellでのみ有効です。新しいターミナルでDjangoを起動する場合は、手順2の環境変数を設定し直してください。接続パスワードや本番用の秘密設定は、ソースコードやGitへ保存しません。

## アカウントとメールの設定

### 担当者を招待する

1. 管理者がDjango管理画面へログインします。
2. 「アカウント招待」で、会社メールアドレス・氏名・部署を登録します。
3. 本人が招待リンクを開き、自分のパスワードを設定します。
4. 会社メールアドレスと設定したパスワードで、メイン画面へログインします。

担当者の利用開始は管理者による招待で行います。`COMPANY_EMAIL_DOMAINS` が未設定の場合や、許可していないドメインのメールアドレスでは招待できません。

招待の再送は、「アカウント招待」一覧の「選択した招待メールを再送する」から行います。利用を停止する場合は、「ユーザー」で対象アカウントの「有効」を外します。パスワードの再設定は、ログイン画面の「パスワードを忘れた方」から本人が行えます。

通常の担当者にスタッフ権限は不要です。管理画面の利用者には必要な権限を割り当て、全権限が必要な管理者だけをスーパーユーザーにします。操作履歴で本人を識別するため、アカウントは個人ごとに使用します。

### メール送信の設定

標準設定では、メール本文と招待・再設定リンクをDjangoの起動ターミナルへ出力します。実際にメールを送る場合は、Djangoを起動する環境でSMTPを設定します。

| 環境変数 | 用途・標準値 |
| --- | --- |
| `COMPANY_EMAIL_DOMAINS` | 招待を許可する会社ドメイン。カンマ区切り。標準では未設定 |
| `FRONTEND_BASE_URL` | メール内のリンク先。標準は `http://127.0.0.1:5173` |
| `DJANGO_MAILER_BACKEND` | SMTP使用時は `django.core.mail.backends.smtp.EmailBackend` を指定 |
| `SMTP_HOST` | SMTPサーバー。SMTP使用時に必須 |
| `SMTP_PORT` | SMTPポート。標準は `587` |
| `SMTP_USERNAME` / `SMTP_PASSWORD` | SMTP認証情報 |
| `SMTP_USE_TLS` / `SMTP_USE_SSL` | 暗号化方式。標準はそれぞれ `true` / `false`。利用するサーバーに合わせて設定 |
| `DEFAULT_FROM_EMAIL` | 送信元メールアドレス。実際に送信可能なアドレスを設定 |

## AWSでの運用

AWSでは、東京リージョンのEC2上でアプリとMySQLを実行します。NginxがReactのビルドファイルを配信し、APIと管理画面へのアクセスをGunicorn経由でDjangoへ渡します。

| 項目 | EC2上の設定 |
| --- | --- |
| アプリの配置先 | `/home/ubuntu/internApp` |
| Djangoの運用設定 | `backend/config/production_settings.py` |
| 接続情報などの環境変数 | `/etc/intern-app/backend.env` |
| アプリのサービス | `intern-app.service` |
| フロントエンドの配信先 | `/var/www/intern-app/frontend` |
| Djangoの静的ファイル | `/var/www/intern-app/static` |
| Nginxの受付先 | `127.0.0.1:8080` |
| Gunicornの受付先 | `127.0.0.1:8001` |

EC2の設定と秘密情報は、運用環境側で管理します。`production_settings.py` はEC2に個別配置するファイルで、リポジトリには含まれません。

閲覧にはSSHポート転送を使用します。手元の `18000` 番ポートをEC2の `127.0.0.1:8080` へ転送している間は、メイン画面を <http://127.0.0.1:18000/>、管理画面を <http://127.0.0.1:18000/admin/> で開けます。これらは接続したパソコン内のURLです。

コードをGitHubへpushするだけでは、AWSは更新されません。運用環境への反映では、バックアップ、コード取得、必要な依存関係・DBの更新、画面のビルドと配置、サービス再起動、稼働確認を行います。手順の詳細は [台帳の運用・更新手順](docs/ledger-workflow.md) を参照してください。

データベースには登録内容だけでなくアカウントと変更履歴も含まれます。Excel出力とコードのGit管理だけでは、これらを復元できないため、データベースと運用設定を含めてバックアップします。

## 主なAPI

メイン画面はDjangoセッションを利用します。台帳APIは有効なアカウントでのログインが必要で、`POST`・`PATCH` にはCSRFトークンを送信します。

| メソッド | URL | 用途 |
| --- | --- | --- |
| `GET` | `/api/auth/session/` | ログイン状態の確認、CSRF Cookieの取得 |
| `POST` | `/api/auth/login/` | ログイン |
| `POST` | `/api/auth/logout/` | ログアウト |
| `GET` | `/api/approved-applications/` | 登録一覧の取得 |
| `POST` | `/api/approved-applications/` | 登録内容の保存とExcel同期 |
| `GET` | `/api/approved-applications/<id>/` | 登録詳細と変更履歴の取得 |
| `PATCH` | `/api/approved-applications/<id>/` | 登録内容の修正 |
| `POST` | `/api/approved-applications/<id>/cancel/` | 登録の取消 |
| `POST` | `/api/approved-applications/<id>/restore/` | 登録の復元 |
| `GET` | `/api/ledgers/` | 種別ごとの件数・同期状態の取得 |
| `GET` | `/api/ledgers/<type>/` | 台帳の全列・全件の取得 |
| `POST` | `/api/ledgers/<type>/sync/` | Excel同期の再試行 |
| `GET` | `/api/ledgers/<type>/download/` | 最新Excelのダウンロード |

`<type>` は `pc`・`phone`・`lan`・`memory`・`other` です。登録一覧と台帳の取得では、`include_cancelled=1` を指定すると取消済みの登録も取得できます。

修正・取消・復元では、取得した登録の `revision` を送信します。保存済みの版番号と一致しない場合は `409 Conflict` を返します。取消には、理由を表す `reason` も必要です。

## 開発時の確認

### フロントエンド

リポジトリのルートフォルダで実行します。

```powershell
npm.cmd run lint
npm.cmd run build
```

### バックエンド

リポジトリのルートフォルダから実行します。

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py check --settings=config.test_settings
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run --settings=config.test_settings
.\.venv\Scripts\python.exe manage.py test accounts asset_requests --settings=config.test_settings
```

`config.test_settings` はメモリ上のSQLiteを使用し、通常のMySQLデータベースから分離してテストします。MySQLの行ロックや別プロセスからの同時更新のテストは、MySQLの専用テスト環境で確認します。

### よくある起動時の問題

| 状況 | 確認すること |
| --- | --- |
| `No module named 'rest_framework'` など | `.venv` 内のPythonを使っているか、`requirements.txt` のインストールが済んでいるか |
| `manage.py` が見つからない | `backend/` に移動しているか |
| MySQLへ接続できない | MySQLが起動しているか、接続先・ユーザー・パスワードを起動中のターミナルへ設定したか |
| 招待メールが届かない | 開発用のターミナル出力になっていないか、SMTPと送信元の設定が正しいか |
| Excelが未反映のまま | 台帳画面の同期結果、保存先への書き込み権限、空き容量を確認して再試行する |
