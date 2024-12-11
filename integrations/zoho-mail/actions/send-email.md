# Send Email

## General Information

- **Description:** An action to send an email in zoho mail

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `ZohoMail.messages.CREATE`
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/zoho-mail/actions/send-email.ts)


## Endpoint Reference

### Request Endpoint

- **Path:** `/zoho-mail/send-email`
- **Method:** `POST`

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
  "status": "<object>",
  "data": "<object>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zoho-mail/actions/send-email.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zoho-mail/actions/send-email.md)

<!-- END  GENERATED CONTENT -->

