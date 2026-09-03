# Asset Desk

React + Viteで作成した社内資産申請画面と、Django + SQLiteで作成した申請データ管理用バックエンドです。

## 構成

- `src/`: Reactフロントエンド
- `backend/config/`: Djangoプロジェクト設定
- `backend/applications/`: 申請モデル、管理画面、テスト、マイグレーション
- `backend/db.sqlite3`: ローカルSQLiteデータベース（Git管理対象外）

## データベース設計

各モデルには、共通の申請者情報（氏名、所属部署、社員番号）と申請日時・更新日時があります。

| Djangoモデル | 対応する申請画面 | 固有の保存項目 |
| --- | --- | --- |
| `PcLoanApplication` | PC貸出申請 | 貸出者氏名、管理番号、利用開始日、利用場所 |
| `ExternalStorageLoanApplication` | 外部記憶装置貸出申請 | 貸出者氏名、機器名、容量、場所、貸し出し日 |
| `LanEquipmentLoanApplication` | LAN機器貸出申請 | 機器種別、機器名、利用開始日、返却予定日、利用場所 |
| `SmartphonePurchaseApplication` | スマートフォン購入申請 | 機種、購入日、容量、SIMの有無 |

## バックエンドのセットアップ

PowerShellで次を実行します。

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py createsuperuser
.\.venv\Scripts\python.exe manage.py runserver
```

ブラウザで `http://127.0.0.1:8000/admin/` を開き、作成した管理者情報でログインすると、4種類の申請データを登録・閲覧・検索できます。

## フロントエンドの起動

別のPowerShellでプロジェクトルートから実行します。

```powershell
npm.cmd install
npm.cmd run dev
```

表示されたURL（通常は `http://localhost:5173/`）を開きます。

## ReactとDjangoの接続

開発環境では、Reactから次の相対URLへ通信します。ViteのプロキシがDjango（`http://127.0.0.1:8000`）へ転送します。

- `GET /api/csrf/`: CSRF Cookieを取得
- `POST /api/applications/`: 申請内容を検証してSQLiteへ保存

申請画面で「入力内容を確認する」を押すと確認画面へ進み、「この内容で申請する」を押すとDjangoへ送信します。保存成功後に受付番号が表示されます。Djangoが起動していない場合や入力値が不正な場合は、完了画面へ進まずエラーを表示します。

入力途中の内容は、ログイン名ごとにブラウザの `sessionStorage` へ下書きとして自動保存されます。申請メニューから再開または破棄でき、Djangoへの保存が成功すると下書きは削除されます。ブラウザのタブを閉じると下書きも削除されます。

ログイン画面は現在フロントエンドのデモ実装です。入力したパスワードはDjangoへ送信されず、データベースにも保存されません。

## 保存の確認

フロントエンドとバックエンドを両方起動して申請した後、`http://127.0.0.1:8000/admin/` で該当する申請種別を開いて確認します。

新しい申請の状態は「申請中」です。管理画面の申請一覧にある「申請状態」で「申請中」「承認」「却下」を選択し、一覧下部の「保存」を押すと状態を更新できます。申請の詳細画面から変更して保存することもできます。

## テスト

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py test applications
```

```powershell
cd ..
npm.cmd run lint
npm.cmd run build
```
