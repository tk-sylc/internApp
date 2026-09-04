# Asset Desk

上司の承認が完了した資産手続きを担当者が登録し、Excel管理台帳へ反映する社内向けアプリです。React + Viteの担当者画面と、Django + MySQLのバックエンドで構成されています。

## 構成

- `src/`: Reactフロントエンド
- `backend/config/`: Djangoプロジェクト設定
- `backend/applications/`: 台帳登録モデル、認証・登録API、管理画面、Excel同期
- MySQL: 台帳登録データとDjangoユーザーの保存先

## データベース設計

担当者画面から登録する内容は `ApprovedApplication` に保存します。従来の4種類の申請モデルとAPIも互換性のため残しています。

| Djangoモデル | 対応する申請画面 | 固有の保存項目 |
| --- | --- | --- |
| `PcLoanApplication` | PC貸出申請 | 貸出者氏名、管理番号、利用開始日、利用場所 |
| `ExternalStorageLoanApplication` | 外部記憶装置貸出申請 | 貸出者氏名、機器名、容量、場所、貸し出し日 |
| `LanEquipmentLoanApplication` | LAN機器貸出申請 | 機器種別、機器名、利用開始日、返却予定日、利用場所 |
| `SmartphonePurchaseApplication` | スマートフォン購入申請 | 機種、購入日、容量、SIMの有無 |
| `ApprovedApplication` | 担当者による台帳登録 | 処理区分、機器種別、申請者、部署、承認日、転記項目、担当者 |

## バックエンドのセットアップ

MySQL 8.0.11以降を用意し、MySQLの管理ユーザーで次のSQLを実行します。

```sql
CREATE DATABASE asset_desk CHARACTER SET utf8mb4;
CREATE USER 'asset_desk_app'@'localhost' IDENTIFIED BY '任意の強いパスワード';
GRANT ALL PRIVILEGES ON asset_desk.* TO 'asset_desk_app'@'localhost';
```

続いてPowerShellで仮想環境とMySQL接続情報を設定します。`MYSQL_PASSWORD`には上のSQLで設定したパスワードを指定してください。

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
$env:MYSQL_DATABASE = 'asset_desk'
$env:MYSQL_USER = 'asset_desk_app'
$env:MYSQL_PASSWORD = '実際のパスワード'
$env:MYSQL_HOST = '127.0.0.1'
$env:MYSQL_PORT = '3306'
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py createsuperuser
.\.venv\Scripts\python.exe manage.py runserver
```

MySQLを別のサーバーで動かす場合は、`MYSQL_HOST`をそのサーバーのホスト名またはIPアドレスに変更します。接続情報はPowerShellを開くたびに設定が必要です。現在のSQLiteデータはMySQLへ移行しません。

`createsuperuser`で作成したユーザーは、担当者画面と `http://127.0.0.1:8000/admin/` の両方へログインできます。

## フロントエンドの起動

別のPowerShellでプロジェクトルートから実行します。

```powershell
npm.cmd install
npm.cmd run dev
```

表示されたURL（通常は `http://localhost:5173/`）を開きます。

## ReactとDjangoの接続

開発環境では、Reactから次の相対URLへ通信します。ViteのプロキシがDjango（`http://127.0.0.1:8000`）へ転送します。

- `GET /api/auth/session/`: ログイン状態とCSRF Cookieを取得
- `POST /api/auth/login/`: Djangoユーザーでログイン
- `POST /api/auth/logout/`: ログアウト
- `GET /api/approved-applications/`: 最近の台帳登録を取得
- `POST /api/approved-applications/`: 承認済み資産処理をMySQLへ保存
- `POST /api/applications/`: 従来の申請登録API（ログイン必須）

担当者は「購入・貸出・返却・廃棄」から処理を選び、承認済みの原本を見ながら転記します。「上司の承認が完了していること」を確認しない限り登録できません。保存後は受付番号が表示され、ホームの最近の登録一覧から検索できます。

入力途中の内容は、ログイン名ごとにブラウザの `sessionStorage` へ下書きとして自動保存されます。台帳ホームから再開または破棄でき、Djangoへの保存が成功すると削除されます。

ログイン画面はDjangoのセッション認証を使用します。未ログインの利用者は台帳データの登録・閲覧APIを利用できません。

## 保存の確認

フロントエンドとバックエンドを起動して台帳登録した後、`http://127.0.0.1:8000/admin/` の「承認済み資産処理」で確認します。

## Excel管理台帳との同期

担当者の登録がMySQLへ保存されると、機器種別に対応するExcel管理台帳が `backend/approved_ledgers/` に自動生成されます。

- `承認済み_PC管理台帳.xlsx`
- `承認済み_外部記憶装置管理台帳.xlsx`
- `承認済み_LAN機器管理台帳.xlsx`
- `承認済み_スマートフォン管理台帳.xlsx`
- `承認済み_その他管理台帳.xlsx`

Excelが開かれているなどの理由で同期できなかった場合も、登録自体はMySQLへ保存されます。Excelを閉じてから次のコマンドを実行すると、台帳を再生成できます。

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py sync_ledgers --approved
```

1種類だけ再生成する場合は `--type` を指定します。

```powershell
.\.venv\Scripts\python.exe manage.py sync_ledgers --approved --type pc
```

## テスト

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py test applications --settings=config.test_settings
```

```powershell
cd ..
npm.cmd run lint
npm.cmd run build
```
