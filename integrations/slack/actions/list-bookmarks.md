<!-- BEGIN GENERATED CONTENT -->
# List Bookmarks

## General Information

- **Description:** Lists all bookmarks in a channel.
- **Version:** 1.0.0
- **Group:** Actions
- **Scopes:** `bookmarks:read`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_slack_listbookmarks`
- **Input Model:** `ActionInput_slack_listbookmarks`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/list-bookmarks.ts)


## Endpoint Reference

### Request Endpoint

`GET /list-bookmarks`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "channel_id": "<string>"
}
```

### Request Response

```json
{
  "ok": "<boolean>",
  "bookmarks": "<unknown[]>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/list-bookmarks.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/list-bookmarks.md)

<!-- END  GENERATED CONTENT -->

