<!-- BEGIN GENERATED CONTENT -->
# Get Upload Url

## General Information

- **Description:** Gets a URL for uploading files to Slack.
- **Version:** 1.0.0
- **Group:** Actions
- **Scopes:** `files:write`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_slack_getuploadurl`
- **Input Model:** `ActionInput_slack_getuploadurl`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/get-upload-url.ts)


## Endpoint Reference

### Request Endpoint

`GET /get-upload-url`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "filename": "<string>",
  "length": "<number>"
}
```

### Request Response

```json
{
  "ok": "<boolean>",
  "upload_url": "<string>",
  "file_id": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/get-upload-url.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/get-upload-url.md)

<!-- END  GENERATED CONTENT -->

