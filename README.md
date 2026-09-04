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
