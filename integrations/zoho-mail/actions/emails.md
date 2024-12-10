# Emails

## General Information
- **Description:** Fetches a list of all your account's emails in Zoho mail

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: ZohoMail.messages.READ
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/zoho-mail/syncs/emails.ts)

### Request Endpoint

- **Path:** `/zoho-mail/emails`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "summary": "<string>",
  "sentDateInGMT": "<string>",
  "calendarType": "<number>",
  "subject": "<string>",
  "messageId": "<string>",
  "flagid": "<string>",
  "status2": "<string>",
  "priority": "<string>",
  "hasInline": "<string>",
  "toAddress": "<string>",
  "folderId": "<string>",
  "ccAddress": "<string>",
  "hasAttachment": "<string>",
  "size": "<string>",
  "sender": "<string>",
  "receivedTime": "<string>",
  "fromAddress": "<string>",
  "status": "<string>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zoho-mail/syncs/emails.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zoho-mail/syncs/emails.md)

<!-- END  GENERATED CONTENT -->

undefined