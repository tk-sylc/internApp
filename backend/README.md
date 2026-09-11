# 社内機器管理 — バックエンド

担当者の認証、承認済み手続きの登録、機器情報の検索、台帳の閲覧・修正・取消、変更履歴の保存、Excel生成を担当するDjangoバックエンドです。

登録内容をMySQLに保存し、そのデータから自動入力用の候補とExcel台帳を生成します。同じ機器の申請でも、各申請は独立した記録です。Excelファイルの読込や、機器の在庫・貸出中状態の管理は行いません。

## 構成

| ファイル・ディレクトリ | 役割 |
| --- | --- |
| `accounts/` | アカウント招待、ログイン、パスワード再設定、プロフィール |
| `asset_requests/models.py` | 台帳データ、参照関係、変更履歴、同期状態 |
| `asset_requests/equipment_history.py` | 登録済みの機器情報と参考の貸出申請の検索 |
| `asset_requests/serializers.py` | 入力項目、コピー対象、参照関係の検証 |
| `asset_requests/approved_workflow.py` | 登録・修正・取消・復元、重複送信対策、履歴の保存 |
| `asset_requests/approved_ledger_sync.py` | 台帳の列定義、Excel生成・同期 |
| `asset_requests/migrations/` | DB構造の変更 |
| `config/` | Django設定、URL定義、WSGIエントリーポイント |
| `approved_ledgers/` | 生成したExcel台帳の標準保存先（Git管理外） |

担当者向けの画面はリポジトリ直下の `src/` にあります。`RegisterFlow.jsx` が登録フォーム、`equipmentPrefill.js` がコピー時の入力状態、`LedgerWorkspace.jsx` が台帳の閲覧・修正を担当します。

## 機器情報の検索と参照関係

### 検索API

有効な担当者アカウントでログインした状態で呼び出します。

```http
GET /api/approved-applications/equipment-history/?application_type=pc&management_number=PC-001
GET /api/approved-applications/equipment-history/?application_type=pc&q=ThinkPad
```

| パラメータ | 用途 |
| --- | --- |
| `application_type` | 必須。`pc`・`phone`・`lan`・`memory`・`other` |
| `management_number` | 同じ種別の管理番号を完全一致で検索。指定時は `q` より優先 |
| `q` | 機器名・機種名・概要・管理番号の部分一致検索 |

レスポンスは `{ "match": null, "candidates": [] }` を基本形とします。管理番号の一致は `match`、部分一致の候補は `candidates` に返します。検索条件が空なら、どちらも空のまま返します。

検索対象は、同じ機器種別の取消されていない登録です。登録日時 `created_at`、IDの降順で調べます。管理番号の完全一致では最初の1件を返します。部分一致では最新200件の一致登録から、管理番号と機器名が同じ候補をまとめて最大20件を返します。管理番号のない記録は、機器名が同じでも別候補として扱います。

候補にはID・受付番号・処理区分・申請者・登録日時・コピー可能な `details` と、参考の貸出を表す `related_loan` を含めます。この `related_loan` は貸出の情報を持つオブジェクトです。保存APIへ送る `related_loan` は、その貸出のIDです。

画面では管理番号の欄から移動した時に完全一致検索を行います。管理番号が空欄なら、機種名・機器名を2文字以上入力した時に候補を表示します。この2文字の条件はフロントエンド側の条件です。

### コピー対象と保存

機器種別ごとのコピー対象は `APPROVED_EQUIPMENT_DETAIL_FIELDS` で定義します。管理番号・名称・性能などの機器情報だけを返し、申請者・部署・数量・日付・目的・場所・状態・メモなどをフォームへコピーしません。LAN機器の `acquisition_method`・`borrowed_from` と、外部記憶装置の `virus_check` も対象外です。

画面では候補の機器情報を編集できます。保存するのは編集後の値で、参照元の申請を書き換えることはありません。既存のExcelにだけある情報や、Excelを直接編集した内容は検索対象に入りません。

`ApprovedApplication` は次の任意の参照を持ちます。

| 保存するフィールド | 内容 |
| --- | --- |
| `source_application` | 機器情報をコピーした申請のID |
| `related_loan` | 返却時に参考とする貸出申請のID |

両方とも `null` を許可します。対応する受付番号は、読取専用の `source_application_reference`・`related_loan_reference` で返します。

参照を新規に設定するときは、同じ機器種別の取消されていない申請であることを検証します。自身への参照はできません。`related_loan` は返却から貸出への参照に限定し、管理番号の一致を検証します。管理番号がない場合は、`source_application` と同じ貸出申請だけを指定できます。

検索時に参考として返す貸出は、同じ種別・管理番号で直近に登録された取消されていない貸出です。管理番号がない場合は、検索で選んだ記録自体が貸出のときだけ参考にします。貸出中・返却済みの判定や二重返却の制限はありません。

保存済みの参照元が後から取り消されても、参照関係を変えないメモ修正などでは過去の参照を保持します。参照関係を変更する場合は再検証します。

## 登録・履歴・Excelの整合性

登録・修正・取消・復元は `approved_workflow.py` を通し、内容と操作履歴を保存してからExcelを更新します。Excel反映が失敗しても、DBに保存した内容は残ります。再登録ではなく同期を再試行します。

新規登録は任意の `Idempotency-Key` ヘッダー（UUID）を受け取ります。同じ担当者・同じキー・同じ内容の再送では既存の登録を返し、同じキーを異なる内容や担当者で再利用した場合は `409 Conflict` を返します。修正・取消・復元では `revision` を使い、他の更新を上書きしないよう検証します。

台帳の表・Excelには「機器情報の参照元申請」「元の貸出申請」の受付番号を出力し、変更履歴にも参照関係を記録します。返却画面の「返却日」「返却先・保管場所」は、既存のキー `usage_end_date`・`location` に保存し、台帳の表・Excelでは「利用終了日」「利用場所」の共通列に出力します。

## 開発・更新・確認

初回の環境構築と通常の起動は、[ルートREADMEのセットアップ手順](../README.md#開発環境のセットアップ) を参照してください。MySQLが起動していれば、MySQLクライアントを開いたままにする必要はありません。Djangoとフロントエンドの開発サーバーは、アプリを使う間は起動しておきます。

コード更新時は、依存関係に変更があればインストールを済ませ、アプリと同じDB接続設定で以下を実行します。`backend/` でのPowerShellコマンドです。

```powershell
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py sync_approved_ledgers
```

`0015_creation_idempotency` は重複送信対策、`0016_application_references` は参照元と貸出の関連付けを追加します。`migrate` は未適用のDB変更だけを反映するため、通常の起動のたびに実行する必要はありません。更新後はDjangoを再起動してください。

機器情報の検索と参照関係を確認するテストは、通常のMySQLから分離したSQLiteで実行できます。

```powershell
.\.venv\Scripts\python.exe manage.py test asset_requests.tests_equipment_history --settings=config.test_settings
```

テスト全体とブラウザでの確認手順は、[開発時の確認](../README.md#開発時の確認) にまとめています。SQLiteでは確認できないMySQLのロック・同時更新は、専用のMySQLテスト環境で確認します。

## 関連する手順

- [アプリの機能と使い方](../README.md#主な機能と使い方)
- [データとExcelの扱い](../README.md#データとexcelの扱い)
- [アカウントとメールの設定](../README.md#アカウントとメールの設定)
- [AWSでの運用](../README.md#awsでの運用)
- [主なAPI](../README.md#主なapi)

開発時のAPIは `http://127.0.0.1:8000/api/`、管理画面は `http://127.0.0.1:8000/admin/` です。メイン画面は `http://127.0.0.1:5173/` から開きます。
