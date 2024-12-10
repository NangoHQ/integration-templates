# Emails

## General Information
- **Description:** Fetches a list of emails from gmail. Goes back default to 1 year
but metadata can be set using the `backfillPeriodMs` property
to change the lookback. The property should be set in milliseconds.

- **Version:** 1.0.3
- **Group:** Others
- **Scopes:**: https://www.googleapis.com/auth/gmail.readonly
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/google-mail/syncs/emails.ts)

### Request Endpoint

- **Path:** `/emails`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "sender": "<string>",
  "recipients?": "<string | undefined>",
  "date": "<string>",
  "subject": "<string>",
  "body?": "<string | undefined>",
  "attachments": [
    {
      "filename": "<string>",
      "mimeType": "<string>",
      "size": "<number>",
      "attachmentId": "<string>"
    }
  ],
  "threadId": "<string>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/google-mail/syncs/emails.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/google-mail/syncs/emails.md)

<!-- END  GENERATED CONTENT -->

undefined