<!-- BEGIN GENERATED CONTENT -->
# Fetch Attachment

## General Information

- **Description:** An action used to fetch the contents of an attachment.

- **Version:** 1.0.1
- **Group:** Others
- **Scopes:** `https://www.googleapis.com/auth/gmail.readonly`
- **Endpoint Type:** Action
- **Model:** `string`
- **Input Model:** `DocumentInput`
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

