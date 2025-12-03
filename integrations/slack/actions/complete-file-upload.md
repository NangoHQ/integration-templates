<!-- BEGIN GENERATED CONTENT -->
# Complete File Upload

## General Information

- **Description:** Finalizes and optionally shares an uploaded file.
- **Version:** 1.0.0
- **Group:** Actions
- **Scopes:** `files:write`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_slack_completefileupload`
- **Input Model:** `ActionInput_slack_completefileupload`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/complete-file-upload.ts)


## Endpoint Reference

### Request Endpoint

`POST /complete-file-upload`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "files": "<unknown[]>",
  "channel_id?": "<string>"
}
```

### Request Response

```json
{
  "ok": "<boolean>",
  "files": "<unknown[]>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/complete-file-upload.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/complete-file-upload.md)

<!-- END  GENERATED CONTENT -->

