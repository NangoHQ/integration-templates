# Send Email

## General Information

- **Description:** Send an Email using Gmail.

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: https://www.googleapis.com/auth/gmail.send
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/google-mail/actions/send-email.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** /emails
- **Method:** POST

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "from": "<string>",
  "to": "<string>",
  "headers": "<object | undefined>",
  "subject": "<string>",
  "body": "<string>"
}
```

### Request Response

```json
{
  "id": "<string>",
  "threadId": "<string>"
}
```
