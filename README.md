# 社内機器管理

承認済みの資産手続きを担当者が入力し、Excel管理台帳へ反映する社内向けアプリです。

## 現在採用している仕様と残しているもの

アプリの方針変更に伴い、現在使用する機能と、互換性・既存データ保護のため残している機能を次のように分けています。

### 現在使用する仕様

- 社員がアプリから申請するのではなく、責任者が処理内容を資産台帳へ登録する
- 処理区分は「購入・貸出・返却・廃棄」、機器種別は「PC・スマートフォン・LAN機器・外部記憶装置」
- 処理区分と機器種別を除き、入力項目はすべて任意
- 「機種・端末名」は「機種名」として一括で表示
- 利用開始日、利用終了日、利用場所を入力項目として残し、返却では利用終了日だけ、廃棄では廃棄日だけを表示する
- 対象者氏名・利用者氏名は重複させず「申請者氏名」に統一する
- PCはCPU、RAM、OS・バージョン、各種ソフトウェア、Browserバージョン、ウイルス対策確認を記録する
- スマートフォンはOS・バージョン、容量、電話番号、キャリア、セキュリティソフトを記録する
- LAN機器は暗号方式（WPA2・WPA・その他）と入手方法（借用・購入）を記録する
- 外部記憶装置は種類、容量、暗号化、ウイルスチェック、パターンファイルを記録する
- 管理者が会社メールを招待し、本人が個別パスワードを設定する
- メイン画面とDjango管理画面のログインは会社メールアドレスとパスワードだけを使用する
- 登録責任者はログインアカウントから自動設定し、利用者は変更できない
- 責任者の氏名・メールアドレスは登録時点の値を固定保存する

### 既存データ保護のため残しているもの

- 旧PC・スマートフォン・LAN・外部記憶装置申請モデルと保存済みデータ
- 旧ステータス（申請中・承認・却下）のDB定義
- 過去の登録に含まれる承認日
- 旧申請APIのコード

これらの旧機能は既存データを失わないためコードとDBに残していますが、現在のメイン画面とDjango管理画面には表示しません。過去の承認日もDBには保持しますが、新しい登録では使用しません。

### リポジトリとブランチ

- 現在の実装は `backend/` をDjangoバックエンドとして使用する
- リポジトリ名とローカルフォルダ名の `internApp` は接続情報として残す
- 開発内容のpush先は `開発担当者の各branch` とし、`main`は明示的な指示があるまで更新しない
- 共同開発者の `backend/` 構成とMySQL方針を採用し、現在の認証・入力・Excel機能をその中へ統合する
- Djangoアプリは役割を明確にするため、認証の `accounts` と機器管理の `asset_requests` に分けたまま残す

## 対象にする業務フロー

```text
社員が申請書を上司へ送付
  → 上司が内容を確認
  → 担当者が申請書を見ながら社内機器管理アプリへ必要項目を入力
  → Djangoへ保存し、申請種別ごとのExcel台帳を自動更新
```

申請・上司承認はこのアプリの対象外です。アプリは承認後の転記作業から始まります。

## 画面ごとの役割

社内機器管理アプリには、日常業務用の「メイン画面」と、設定・管理用の「Django管理画面」があります。

| 画面 | URL | 主な利用者 | 役割 |
| --- | --- | --- | --- |
| メイン画面 | <http://127.0.0.1:5173/> | 登録担当者 | 購入・貸出・返却・廃棄の登録、台帳全体の閲覧、全担当者の登録の修正・取消・復元、履歴確認、最新Excelの取得 |
| Django管理画面 | <http://127.0.0.1:8000/admin/> | 管理者 | アカウントの作成・停止と権限管理、資産台帳の参照 |

普段の転記作業にはメイン画面を使います。管理画面はアカウント管理に使用します。履歴や同時編集のチェックを迂回しないよう、資産台帳の登録・修正・取消は管理者もメイン画面で行います。

旧フローの「申請中・承認・却下」を持つ申請データは、既存データ保護のため削除せず保存していますが、現在の管理画面には表示しません。

### メイン画面の操作手順

```text
ログイン
  → 購入・貸出・返却・廃棄を選択
  → 機器種別と必要項目を入力
  → 内容を確認してExcel台帳へ登録
```

処理区分と機器種別を選択した後の入力項目は、対応できない場合を考慮してすべて任意です。分かる範囲だけ入力できます。

すべての機器で、入力欄は「機器の基本情報 → 管理番号・数量 → 利用日 → 目的・処理内容 → 利用場所 → 技術・セキュリティ確認 → 担当者メモ」の優先順位で表示します。

## 現在の機能

- Djangoセッションによる担当者ログイン
- 最初に「購入・貸出・返却・廃棄」から作業を選ぶシンプルな動線
- PC、スマートフォン、LAN機器、外部記憶装置の種別別入力フォーム
- 申請者氏名、機種名、利用日、目的、利用場所などを分かる範囲で入力
- PC・スマートフォンのOS・バージョン、セキュリティソフトとウイルス対策導入確認
- LAN機器の暗号方式と入手方法
- 外部記憶装置の種類、容量、暗号化・ウイルスチェック情報
- 営業部、総務部、システム部の部署選択
- 登録前の確認画面
- ログインアカウントから登録責任者の氏名・メールアドレスを自動表示
- 入力内容、変更できない登録責任者、登録日時の保存
- 機器種別ごとのExcel台帳生成（処理区分も保存）
- 最近の登録一覧と検索
- Django管理画面での確認

## 台帳の閲覧・修正・同期

申請と承認はアプリ外で行います。担当者が承認済みの内容を登録し、データベースを正本としてExcelへ一方向に反映します。ダウンロードしたExcelの直接編集をアプリへ取り込む機能はありません。

- 「台帳を確認」から、機器種別ごとの全件・全列を表で閲覧できます。検索を解除すると全件へ戻ります。
- Excelダウンロードは検索条件に関係なく、その種別の有効な登録をすべて出力します。最新の生成に失敗した場合は古いファイルを配布しません。
- アプリに招待された有効な担当者は、自分以外の担当者の登録も修正・取消・復元できます。スタッフ権限は不要です。
- 登録責任者の氏名・メール・登録日時は保持し、操作した担当者・日時・変更前後を履歴へ追加します。履歴は画面から編集・削除できません。
- 同じ登録を別の人が先に更新していた場合は409で保存を拒否し、最新内容の再読込を求めます。
- 取消は物理削除しません。理由と履歴を保持して通常の台帳・Excelから除外し、取消済み表示から復元できます。機器の「廃棄」とは別の操作です。
- DB保存とExcelの書込は別の処理です。Excel更新に失敗しても登録自体は残り、未反映を表示して同期だけ再試行できます。
- すでにPCへダウンロードしたコピーは更新・取消されません。最新のExcelを再取得してください。

過去の登録を移行時に削除・作り直すことはありません。機能導入前の変更履歴は復元できないため、導入後の操作から履歴を記録します。

AWSへの反映方法は [台帳機能の更新手順](docs/ledger-workflow.md) を参照してください。

## 構成

- `src/`: Reactの担当者画面
- `backend/accounts/`: ログイン・アカウント管理
- `backend/asset_requests/`: 承認済み手続きとExcel出力API
- `backend/approved_ledgers/`: 生成したExcel（Git管理外）

旧「社員がアプリから申請する」実装は、元の `tk-sylc/sylc` リポジトリへ統合済みです。`internApp` の復元用ブランチ `archive/asset-request-portal` にも切り替え前の状態を保存しています。

## アカウントの作成と権限

現在は、メイン画面から利用者自身がアカウントを作る方式ではありません。管理者がDjango管理画面から、必要な担当者のアカウントを発行します。

### 最初の管理者を作る

```powershell
cd C:\Users\sylc0277\Desktop\sylc_intern\internApp\backend
.\.venv\Scripts\python.exe manage.py createsuperuser
```

画面の案内に従って、内部管理用ユーザー名、メールアドレス、パスワードを入力します。作成後の管理画面ログインではユーザー名を使わず、会社メールアドレスとパスワードを入力します。

### 担当者のアカウントを作る

Djangoを起動するPowerShellで、最初に会社メールのドメインを設定します。`example.co.jp`は実際の会社ドメインに置き換えてください。

```powershell
$env:COMPANY_EMAIL_DOMAINS = "example.co.jp"
.\.venv\Scripts\python.exe manage.py runserver
```

1. Django管理画面 <http://127.0.0.1:8000/admin/> を開く
2. 管理者アカウントでログインする
3. 「アカウント招待」を開く
4. 「アカウント招待を追加」を押す
5. 会社メールアドレス、氏名、部署を入力して保存する
6. 本人へ届いた招待リンクから、本人専用のパスワードを設定してもらう
7. 本人が会社メールアドレスと設定したパスワードでメイン画面へログインする

利用者がメイン画面から自由にアカウントを作ることはできません。管理者が招待した会社メールアドレスだけが利用できます。パスワードを忘れた場合は、ログイン画面の「パスワードを忘れた方」から本人が再設定できます。

招待メールを再送する場合は、管理画面の「アカウント招待」一覧で対象を選択し、「選択した招待メールを再送する」を実行します。退職などで利用を停止する場合は、「ユーザー」で対象者の「有効」のチェックを外します。

通常の担当者にスタッフ権限は付けません。管理画面を使う担当者にだけ「スタッフ権限」と必要な権限を付与し、すべてを管理する人だけをスーパーユーザーにしてください。

### 開発中のメール確認

初期設定では、メール本文が実際には送信されず、Djangoを起動しているPowerShellに表示されます。表示された `http://127.0.0.1:5173/#/activate-account?...` をブラウザで開くと初回パスワードを設定できます。本番運用ではSMTPサーバーの設定が必要です。

## セットアップ

PythonとMySQL Serverをインストールします。

### WindowsでMySQLを自動設定する場合

MySQL Server 8.4をインストールしたあと、管理者として開いたPowerShellでリポジトリ直下から実行します。

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\setup_mysql.ps1
```

このスクリプトは `MySQL84` Windowsサービス、`intern_app` データベース、アプリ専用ユーザーを作成し、DjangoのマイグレーションとSQLiteデータ移行を実行します。ランダム生成した接続情報は現在のWindowsユーザーの環境変数へ保存し、Gitには保存しません。

MySQL管理者パスワードが必要な場合は、次のコマンドで現在のWindowsユーザーに保存された値を確認できます。画面共有中などに表示しないでください。

```powershell
[Environment]::GetEnvironmentVariable("INTERNAPP_MYSQL_ROOT_PASSWORD", "User")
```

### 手動でMySQLを設定する場合

MySQLへ管理者で接続し、開発用のデータベースと専用ユーザーを作成します。

```sql
CREATE DATABASE intern_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'intern_app'@'localhost' IDENTIFIED BY '任意の強いパスワード';
GRANT ALL PRIVILEGES ON intern_app.* TO 'intern_app'@'localhost';
FLUSH PRIVILEGES;
```

次にPowerShellでバックエンドを準備します。

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
$env:MYSQL_DATABASE = "intern_app"
$env:MYSQL_USER = "intern_app"
$env:MYSQL_PASSWORD = "MySQLで設定したパスワード"
$env:MYSQL_HOST = "127.0.0.1"
$env:MYSQL_PORT = "3306"
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py createsuperuser
```

MySQLの接続情報はターミナルを開き直すと消えます。開発中はDjangoを起動するPowerShellで毎回設定してください。パスワードはREADMEやGitへ書き込みません。

フロントエンドを準備します。

```powershell
cd ..
npm.cmd install
```

## 起動

1つ目のPowerShell:

```powershell
cd backend
$env:MYSQL_DATABASE = "intern_app"
$env:MYSQL_USER = "intern_app"
$env:MYSQL_PASSWORD = "MySQLで設定したパスワード"
.\.venv\Scripts\python.exe manage.py runserver
```

2つ目のPowerShell:

```powershell
npm.cmd run dev
```

- アプリ: <http://127.0.0.1:5173/>
- Django管理画面: <http://127.0.0.1:8000/admin/>

## Pythonと仮想環境の役割

このプロジェクトでは、`.venv` というinternApp専用のPython環境を使用します。Django REST Frameworkやopenpyxlなど、internAppに必要なライブラリはこの中に入っています。

仮想環境を有効化せずに `python manage.py runserver` を実行すると、PC全体のPythonが使われ、`rest_framework` などが見つからないことがあります。通常は次のコマンドを使用してください。

```powershell
.\.venv\Scripts\python.exe manage.py runserver
```

先に仮想環境を有効化する方法もあります。

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.\.venv\Scripts\Activate.ps1
python manage.py runserver
```

ターミナルの先頭に `(.venv)` と表示されていれば、`python` だけでinternApp専用環境が使われます。サーバーを終了するときは `Ctrl+C` を押します。

## データベースとExcelの保存場所

- 通常使用するデータベース: MySQLの `intern_app`
- 移行前のローカルデータ: `backend/db.sqlite3`（保護のため当面残す・Git管理外）
- 生成したExcel台帳: `backend/approved_ledgers/`（Git管理外）

Excelは登録・修正・取消・復元の後に、機器種別ごとに生成・更新されます。データベースとExcelはGitHubへpushされません。

### 旧SQLiteデータをMySQLへ移す場合

まずSQLiteを明示してデータを書き出します。

```powershell
cd backend
$env:DATABASE_ENGINE = "sqlite"
$env:PYTHONUTF8 = "1"
.\.venv\Scripts\python.exe manage.py dumpdata --natural-foreign --natural-primary --exclude contenttypes --exclude auth.permission --exclude sessions --exclude admin.logentry --indent 2 --output sqlite-data.json
```

次に、同じPowerShellでMySQLへ切り替えて移行します。

```powershell
$env:DATABASE_ENGINE = "mysql"
$env:MYSQL_DATABASE = "intern_app"
$env:MYSQL_USER = "intern_app"
$env:MYSQL_PASSWORD = "MySQLで設定したパスワード"
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py loaddata sqlite-data.json
```

移行が確認できるまでは `backend/db.sqlite3` を削除しないでください。

## よくあるエラー

### `No module named 'rest_framework'`

PC全体のPythonを使っている可能性があります。次を実行します。

```powershell
.\.venv\Scripts\python.exe manage.py runserver
```

### `can't open file ... manage.py`

現在いるフォルダが違います。移動してから起動します。

```powershell
cd C:\Users\sylc0277\Desktop\sylc_intern\internApp\backend
.\.venv\Scripts\python.exe manage.py runserver
```

### `KeyboardInterrupt`

起動中に `Ctrl+C` などで処理を中断したことを表します。Djangoのコードエラーではありません。もう一度起動し、`Starting development server` と表示されるまで待ちます。

## 主なAPI

| メソッド | URL | 用途 |
| --- | --- | --- |
| `GET` | `/api/auth/session/` | ログイン状態とCSRF Cookie取得 |
| `POST` | `/api/auth/login/` | ログイン |
| `POST` | `/api/auth/logout/` | ログアウト |
| `GET` | `/api/approved-applications/` | 登録履歴一覧 |
| `POST` | `/api/approved-applications/` | 転記内容の登録 |
| `GET` / `PATCH` | `/api/approved-applications/<id>/` | 詳細・履歴の取得 / revision付き修正 |
| `POST` | `/api/approved-applications/<id>/cancel/` | revision・reason付き取消 |
| `POST` | `/api/approved-applications/<id>/restore/` | revision付き復元 |
| `GET` | `/api/ledgers/` | 台帳一覧・同期状態 |
| `GET` | `/api/ledgers/<type>/` | Excelと同じ列・全件の台帳 |
| `POST` | `/api/ledgers/<type>/sync/` | DBを正本にExcelを再生成 |
| `GET` | `/api/ledgers/<type>/download/` | 最新の台帳全体をExcelで取得 |

## テスト

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run --settings=config.test_settings
.\.venv\Scripts\python.exe manage.py check --settings=config.test_settings
.\.venv\Scripts\python.exe manage.py test accounts asset_requests --settings=config.test_settings
```

```powershell
cd ..
npm.cmd run lint
npm.cmd run build
```

## 次の実装候補

1. 実際の申請書とExcel台帳の列名を確定する
2. 担当者が原本と照合しやすい入力順へ調整する
3. 既存Excelの書式・保存場所に合わせて出力方式を調整する
