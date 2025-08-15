<!-- BEGIN GENERATED CONTENT -->
# Send Email

## General Information

- **Description:** An action to send an email in zoho mail
- **Version:** 1.0.0
- **Group:** Others
- **Scopes:** `ZohoMail.messages.CREATE`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_zoho_mail_sendemail`
- **Input Model:** `ActionInput_zoho_mail_sendemail`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/zoho-mail/actions/send-email.ts)


## Endpoint Reference

### Request Endpoint

`POST /zoho-mail/send-email`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "accountId": "<string>",
  "fromAddress": "<string>",
  "toAddress": "<string>",
  "ccAddress": "<string>",
  "bccAddress": "<string>",
  "subject": "<string>",
  "encoding": "<string>",
  "mailFormat": "<string>",
  "askReceipt": "<string>"
}
```

### Request Response

```json
{
  "status": {},
  "data": {}
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zoho-mail/actions/send-email.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zoho-mail/actions/send-email.md)

<!-- END  GENERATED CONTENT -->

