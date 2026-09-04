# 社内機器管理（internApp）

承認済みの資産手続きを担当者が入力し、Excel管理台帳へ反映する社内向けアプリです。

## 対象にする業務フロー

```text
社員がPDF申請書を上司へ送付
  → 上司が内容を確認して押印
  → 担当者が申請書を見ながら社内機器管理アプリへ必要項目を入力
  → Djangoへ保存し、申請種別ごとのExcel台帳を自動更新
```

申請・上司承認・電子押印はこのアプリの対象外です。アプリは押印後の転記作業から始まります。

## 画面ごとの役割

社内機器管理アプリには、日常業務用の「メイン画面」と、設定・管理用の「Django管理画面」があります。

| 画面 | URL | 主な利用者 | 役割 |
| --- | --- | --- | --- |
| メイン画面 | <http://127.0.0.1:5173/> | 登録担当者 | 購入・貸出・返却・廃棄の入力、内容確認、Excel台帳への登録、最近の登録の検索 |
| Django管理画面 | <http://127.0.0.1:8000/admin/> | 管理者 | アカウントの作成・停止、資産台帳登録の確認・修正、登録責任者や登録日時の確認 |

普段の転記作業にはメイン画面を使います。管理画面は、アカウント管理や誤登録の修正など、管理者だけが必要な場面で使います。

旧フローの「申請中・承認・却下」を持つ申請データは、既存データ保護のため削除せず保存していますが、現在の管理画面には表示しません。

### メイン画面の操作手順

```text
ログイン
  → 購入・貸出・返却・廃棄を選択
  → 機器種別と必要項目を入力
  → 内容を確認してExcel台帳へ登録
```

処理区分と機器種別を選択した後の入力項目は、対応できない場合を考慮してすべて任意です。分かる範囲だけ入力できます。

## 現在の機能

- Djangoセッションによる担当者ログイン
- 最初に「購入・貸出・返却・廃棄」から作業を選ぶシンプルな動線
- PC、スマートフォン、LAN機器、外部記憶装置の種別別入力フォーム
- 機種名、利用開始日、利用終了日、利用場所などをすべて任意で入力
- スマートフォンではOS（iOS・Android・指定なし）を選択可能
- 購入日と承認日は入力・表示しない
- 営業部、総務部、システム部の部署選択
- 登録前の確認画面
- ログインアカウントから登録責任者の氏名・メールアドレスを自動表示
- 入力内容、変更できない登録責任者、登録日時の保存
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
