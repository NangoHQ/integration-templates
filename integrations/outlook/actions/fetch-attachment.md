# Fetch Attachment

## General Information

- **Description:** An action used to fetch the contents of an attachment.

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `Mail.Read`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/outlook/actions/fetch-attachment.ts)


## Endpoint Reference

### Request Endpoint

- **Path:** `/fetch-attachment`
- **Method:** `GET`

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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/outlook/actions/fetch-attachment.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/outlook/actions/fetch-attachment.md)

<!-- END  GENERATED CONTENT -->

