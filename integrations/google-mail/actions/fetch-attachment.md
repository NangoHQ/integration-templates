<!-- BEGIN GENERATED CONTENT -->
# Fetch Attachment

## General Information

- **Description:** An action used to fetch the contents of an attachment.
- **Version:** 2.0.0
- **Group:** Others
- **Scopes:** `https://www.googleapis.com/auth/gmail.readonly`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_google_mail_fetchattachment`
- **Input Model:** `ActionInput_google_mail_fetchattachment`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/google-mail/actions/fetch-attachment.ts)


## Endpoint Reference

### Request Endpoint

`GET /attachment`

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

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/google-mail/actions/fetch-attachment.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/google-mail/actions/fetch-attachment.md)

<!-- END  GENERATED CONTENT -->

