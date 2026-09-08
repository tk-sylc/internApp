# 台帳機能の運用・更新手順

## 日常の流れ

1. 承認済みの申請書を見ながら登録する。
2. 「台帳を確認」でExcelと同じ列・全件を確認する。
3. 登録を開いて詳細・変更履歴を確認し、必要なら修正する。
4. 誤登録は修正画面の取消操作を使う。理由を残し、必要な場合は復元する。
5. 未反映の台帳は同期を再試行する。Excelダウンロードは常に種別全体が対象。

登録責任者は最初の登録者として固定です。変更履歴の操作担当者はログイン中の本人からサーバーで決めます。別の担当者の登録でも修正できるため、個人アカウントを共有しない運用にします。

## 更新前の確認

この変更はDB項目と履歴・同期状態のテーブルを追加します。コードの更新だけでは動きません。DBのバックアップとマイグレーションが必要です。既存のDjango 6.1・MySQL 8.4・Gunicorn・Nginxを使用します。

開発ブランチは `feature/ledger-workflow` です。確認・承認後に `main`へ統合し、AWSへ反映します。GitHubへのpushだけでAWSが自動更新される仕組みはありません。

EC2上で手作業した `backend/config/production_settings.py`、`/etc/intern-app/backend.env`、systemd・Nginxの設定は保持してください。秘密キー・パスワードをGitへ入れないでください。`git status`で既存の変更を確認し、上書き・強制リセットは行いません。

## EC2での反映

利用者が操作していない時間に実施します。次は会話で設定した `/home/ubuntu/internApp`、`intern-app.service`、`/etc/intern-app/backend.env` を前提とした手順です。反映する変更がGitHubのmainへpush済みであることを先に確認してください。

### 1. バックアップ

```bash
sudo sh -c 'umask 077; mysqldump --single-transaction --routines --events --triggers intern_app > /root/intern-app-before-ledger-$(date +%Y%m%d-%H%M%S).sql'
```

エラーが出た場合は先へ進みません。これは同じEC2内の作業前バックアップであり、別の保存先への定期バックアップの代わりではありません。

### 2. コード取得・ビルド

```bash
cd /home/ubuntu/internApp
git status --short
git fetch origin
```

承認済みのmainを取得します。

```bash
git switch main
git pull --ff-only
```

ブランチの切替・取得時にローカル変更の警告が出たら、強制せず内容を確認します。

```bash
backend/.venv/bin/python -m pip install -r backend/requirements.txt
npm ci
npx vite build
```

### 3. サービス停止・DB更新

```bash
sudo systemctl stop intern-app
sudo systemd-run --wait --pipe --collect \
  --property=User=ubuntu \
  --property=WorkingDirectory=/home/ubuntu/internApp/backend \
  --property=EnvironmentFile=/etc/intern-app/backend.env \
  --setenv=DJANGO_SETTINGS_MODULE=config.production_settings \
  /home/ubuntu/internApp/backend/.venv/bin/python manage.py migrate
```

必ず成功を確認します。`manage.py`を普通のシェルで実行するだけでは、systemdの秘密設定は自動で読まれません。テスト用設定で本番DBのマイグレーションを実行しないでください。

### 4. 静的ファイル・画面の配信

```bash
sudo systemd-run --wait --pipe --collect \
  --property=User=ubuntu \
  --property=WorkingDirectory=/home/ubuntu/internApp/backend \
  --property=EnvironmentFile=/etc/intern-app/backend.env \
  --setenv=DJANGO_SETTINGS_MODULE=config.production_settings \
  /home/ubuntu/internApp/backend/.venv/bin/python manage.py collectstatic --noinput
sudo cp -R dist/. /var/www/intern-app/frontend/
sudo chmod -R a+rX /var/www/intern-app/frontend
sudo systemctl start intern-app
sudo systemctl status intern-app --no-pager
```

Nginxの `/api/` 転送が設定済みなので、今回のAPI追加のためにAWSのポートを開放する必要はありません。HTTP/HTTPS・社内アクセス制限の準備は別途保留中です。

### 5. 確認

- ログイン後に台帳全体が表示されること。
- 既存の登録責任者・登録内容が残っていること。
- テスト登録を別の担当者で修正し、操作者・変更前後が履歴に残ること。
- 同じ登録を2画面で開き、古い方の保存が拒否されること。
- 取消で表と最新Excelから消え、取消済みから復元できること。
- 検索中でもExcelにその種別の全有効件数が含まれること。
- 同期状態が更新されること。失敗時に再登録せず同期再試行できること。

導入直後の既存台帳は同期状態が未反映になる場合があります。各台帳で同期を実行するか、最新Excelを取得してください。導入前の履歴は表示できません。

## 同期をコマンドで行う場合

運用用環境設定を読み込んだ上で `python manage.py sync_approved_ledgers` を実行すると、全種別を再生成できます。種別を絞る場合は末尾に `pc phone` などを付けます。既存の `sync_ledgers` は旧申請モデル用の別コマンドです。

## 検証範囲

自動テストでは、新規登録・交差ユーザー修正・改ざん防止・取消/復元・全件出力・認証/CSRF・同期失敗/再試行・移行前のデータ保持を確認します。MySQL用テストDBでは、独立したPythonプロセスによる同時修正と台帳ロックも確認しています。AWS実機への反映後には上記の画面操作確認を別途行ってください。

## 障害時

```bash
sudo journalctl -u intern-app -n 100 --no-pager
sudo systemctl is-active mysql
```

DB保存成功・Excel失敗は別々に扱います。失敗中は通常の登録を繰り返さず、保存済みの登録と台帳の未反映表示を確認します。履歴は通常のアプリから変更できませんが、DB管理者まで制約する改ざん防止ストレージではありません。

DBを以前のバックアップに戻すと、その後の登録・修正履歴も失われます。障害時はまず追加操作を止め、原因を確認してください。マイグレーションの逆実行や旧版コードへの切戻しを、稼働中に無条件で行わないでください。
