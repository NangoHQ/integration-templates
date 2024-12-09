# Fetch Attachment

## General Information

- **Description:** An action used to fetch the contents of an attachment.

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: https://www.googleapis.com/auth/gmail.readonly
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/google-mail/actions/fetch-attachment.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** /attachment
- **Method:** GET

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "threadId": "<string>",
  "attachmentId": "<string>"
}
```

### Request Response

```json
"<string>"
```
