<!-- BEGIN GENERATED CONTENT -->
# Send Email

## General Information

- **Description:** Send an Email using Gmail.

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:** `https://www.googleapis.com/auth/gmail.send`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/google-mail/actions/send-email.ts)


## Endpoint Reference

### Request Endpoint

`POST /emails`

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

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/google-mail/actions/send-email.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/google-mail/actions/send-email.md)

<!-- END  GENERATED CONTENT -->

