<!-- BEGIN GENERATED CONTENT -->
# Add Bookmark

## General Information

- **Description:** Adds a bookmark link to a channel.
- **Version:** 1.0.0
- **Group:** Actions
- **Scopes:** `bookmarks:write`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_slack_addbookmark`
- **Input Model:** `ActionInput_slack_addbookmark`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/add-bookmark.ts)


## Endpoint Reference

### Request Endpoint

`POST /add-bookmark`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "channel_id": "<string>",
  "title": "<string>",
  "type": "<string>",
  "link": "<string>"
}
```

### Request Response

```json
{
  "ok": "<boolean>",
  "bookmark?": "<unknown>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/add-bookmark.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/add-bookmark.md)

<!-- END  GENERATED CONTENT -->

