# しまっちゃうおじさん

SlackにファイルがアップされたらAWSのS3に自動でアップするよ!

# 事前準備

1. AWSのアカウントを用意し、S3にアクセスできるアクセスキーを発行する
2. SlackのBOT用のAPIトークンを発行する


# 使い方

## 設定ファイル編集

config.jsonを編集します

```json
{
  "token": "slack-api-token",
  "accessKeyId": "aws-access-key",
  "secretAccessKey": "aws-secret-key",
  "region": "aws-region",
  "bucket": "bucket-name",
  "useProxy": false,
  "proxy": "proxy-server"
}
```
### 設定項目

- token: SlackのAPIトークン
- accessKeyId: AWSのアクセスキー
- secretAccessKey: AWSのシークレットアクセスキー
- region: AWSのリージョン
- bucket: ファイルを保存するS3のバケット名
- useProxy: プロキシサーバーを使用するか否か
- proxy: プロキシサーバーのURL(useProxy===trueの時のみ必要)

## 起動

### 通常起動
`npm install`  
`npm start`

### Dockerを使う場合

`docker build -t <image-name>:<tag> .`  
`docker run -tid <image-id>` 
