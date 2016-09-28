# しまっちゃうおじさん

SlackにファイルがアップされたらAWSのS3に自動でアップするよ!

# Usage

## パッケージインストール  
`npm install`

## 設定ファイル編集

config.jsonを編集します

```json
{
  "token": "slack-api-token",
  "accessKeyId": "aws-access-key",
  "secretAccessKey": "aws-secret-key",
  "region": "aws-region",
  "bucket": "bucket-name"
}
```

## 起動
`npm start`
