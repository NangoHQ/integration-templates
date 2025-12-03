<!-- BEGIN GENERATED CONTENT -->
# List Files

## General Information

- **Description:** Lists files in a workspace with optional filtering.
- **Version:** 1.0.0
- **Group:** Files
- **Scopes:** `files:read`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_slack_listfiles`
- **Input Model:** `ActionInput_slack_listfiles`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/list-files.ts)


## Endpoint Reference

### Request Endpoint

`GET /files/list`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "channel_id?": "<string>",
  "user_id?": "<string>",
  "types?": "<string>",
  "count?": "<number>",
  "page?": "<number>"
}
```

### Request Response

```json
{
  "ok": "<boolean>",
  "files": [
    {
      "id": "<string>",
      "name": "<string | null>",
      "title": "<string | null>",
      "mimetype": "<string | null>",
      "filetype": "<string | null>",
      "size": "<number | null>",
      "created": "<number | null>",
      "timestamp": "<number | null>"
    }
  ],
  "paging": {
    "count": "<number>",
    "total": "<number>",
    "page": "<number>",
    "pages": "<number>"
  }
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/list-files.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/list-files.md)

<!-- END  GENERATED CONTENT -->

