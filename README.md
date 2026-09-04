# internApp

承認済みの資産手続きを担当者が入力し、Excel管理台帳へ反映する社内向けアプリです。

## 対象にする業務フロー

```text
社員がPDF申請書を上司へ送付
  → 上司が内容を確認して押印
  → 担当者が申請書を見ながらinternAppへ必要項目を入力
  → Djangoへ保存し、申請種別ごとのExcel台帳を自動更新
```

申請・上司承認・電子押印はこのアプリの対象外です。アプリは押印後の転記作業から始まります。

## 画面ごとの役割

internAppには、日常業務用の「メイン画面」と、設定・管理用の「Django管理画面」があります。

| 画面 | URL | 主な利用者 | 役割 |
| --- | --- | --- | --- |
| メイン画面 | <http://127.0.0.1:5173/> | 登録担当者 | 購入・貸出・返却・廃棄の入力、内容確認、Excel台帳への登録、最近の登録の検索 |
| Django管理画面 | <http://127.0.0.1:8000/admin/> | 管理者 | アカウントの作成・停止、登録データの確認・修正、登録担当者や登録日時の確認 |

普段の転記作業にはメイン画面を使います。管理画面は、アカウント管理や誤登録の修正など、管理者だけが必要な場面で使います。

### メイン画面の操作手順

```text
ログイン
  → 購入・貸出・返却・廃棄を選択
  → 機器種別と必要項目を入力
  → 上司の承認済みチェック
  → 内容を確認してExcel台帳へ登録
```

購入では管理番号を入力しません。貸出・返却・廃棄では、既存の機器を特定するため管理番号が必須です。

## 現在の機能

- Djangoセッションによる担当者ログイン
- 上司の承認が完了していることの確認チェック
- 最初に「購入・貸出・返却・廃棄」から作業を選ぶシンプルな動線
- PC、スマートフォン、LAN機器、外部記憶装置の種別別入力フォーム
- 購入では管理番号不要、貸出・返却・廃棄では管理番号必須
- 営業部、総務部、システム部の部署選択
- 登録前の確認画面
- 入力内容、登録担当者、登録日時の保存
- 機器種別ごとのExcel台帳生成（処理区分も保存）
- 最近の登録一覧と検索
- Django管理画面での確認

PDFファイル自体はアプリへアップロードせず、従来のメールや共有フォルダで管理します。

## 構成

- `src/`: Reactの担当者画面
- `django-project/accounts/`: ログイン・アカウント管理
- `django-project/asset_requests/`: 承認済み手続きとExcel出力API
- `django-project/approved_ledgers/`: 生成したExcel（Git管理外）

旧「社員がアプリから申請する」実装は、元の `tk-sylc/sylc` リポジトリへ統合済みです。`internApp` の復元用ブランチ `archive/asset-request-portal` にも切り替え前の状態を保存しています。

## アカウントの作成と権限

現在は、メイン画面から利用者自身がアカウントを作る方式ではありません。管理者がDjango管理画面から、必要な担当者のアカウントを発行します。

### 最初の管理者を作る

```powershell
cd C:\Users\sylc0277\Desktop\sylc_intern\internApp\django-project
.\.venv\Scripts\python.exe manage.py createsuperuser
```

画面の案内に従って、ユーザー名、メールアドレス、パスワードを入力します。

### 担当者のアカウントを作る

1. Django管理画面 <http://127.0.0.1:8000/admin/> を開く
2. 管理者アカウントでログインする
3. 「ユーザー」を開く
4. 「ユーザーを追加」を押す
5. ユーザー名とパスワードを登録する
6. 必要に応じてメールアドレスを登録する

メイン画面だけを使う担当者には通常ユーザーを作成します。管理画面にも入れる担当者には「スタッフ権限」と必要な権限を付与します。すべてを管理する人だけをスーパーユーザーにしてください。

## セットアップ

Pythonをインストールしたあと、PowerShellで実行します。

```powershell
cd django-project
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py createsuperuser
```

フロントエンドを準備します。

```powershell
cd ..
npm.cmd install
```

## 起動

1つ目のPowerShell:

```powershell
cd django-project
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

## データとExcelの保存場所

- ローカルデータベース: `django-project/db.sqlite3`
- 生成したExcel台帳: `django-project/approved_ledgers/`

Excelは処理を1件登録したときに、機器種別ごとに生成・更新されます。データベースとExcelはGitHubへpushされません。

## よくあるエラー

### `No module named 'rest_framework'`

PC全体のPythonを使っている可能性があります。次を実行します。

```powershell
.\.venv\Scripts\python.exe manage.py runserver
```

### `can't open file ... manage.py`

現在いるフォルダが違います。移動してから起動します。

```powershell
cd C:\Users\sylc0277\Desktop\sylc_intern\internApp\django-project
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

## 次の実装候補

1. 実際の申請書とExcel台帳の列名を確定する
2. 担当者が原本と照合しやすい入力順へ調整する
3. 既存Excelの書式・保存場所に合わせて出力方式を調整する
