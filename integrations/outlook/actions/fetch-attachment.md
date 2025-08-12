<!-- BEGIN GENERATED CONTENT -->
# Fetch Attachment

## General Information

- **Description:** An action used to fetch the contents of an attachment.
- **Version:** 1.0.0
- **Group:** Others
- **Scopes:** `Mail.Read`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_outlook_fetchattachment`
- **Input Model:** `ActionInput_outlook_fetchattachment`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/outlook/actions/fetch-attachment.ts)


## Endpoint Reference

### Request Endpoint

`GET /fetch-attachment`

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

