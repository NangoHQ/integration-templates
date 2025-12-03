<!-- BEGIN GENERATED CONTENT -->
# Search Messages

## General Information

- **Description:** Searches for messages matching a query in Slack workspace (requires user token).
- **Version:** 1.0.0
- **Group:** Search
- **Scopes:** `search:read`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_slack_searchmessages`
- **Input Model:** `ActionInput_slack_searchmessages`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/search-messages.ts)


## Endpoint Reference

### Request Endpoint

`GET /search-messages`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "query": "<string>",
  "count?": "<number>",
  "page?": "<number>",
  "sort?": "<enum: 'score' | 'timestamp'>",
  "sort_dir?": "<enum: 'asc' | 'desc'>"
}
```

### Request Response

```json
{
  "ok": "<boolean>",
  "messages": {
    "total": "<number>",
    "matches": [
      {
        "type": "<string>",
        "ts": "<string>",
        "text": "<string>",
        "channel": {
          "id": "<string>",
          "name": "<string>"
        },
        "user": "<string | null>",
        "username": "<string | null>",
        "permalink": "<string>"
      }
    ],
    "pagination": {
      "total_count": "<number>",
      "page": "<number>",
      "per_page": "<number>",
      "page_count": "<number>",
      "first": "<number>",
      "last": "<number>"
    }
  }
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/search-messages.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/search-messages.md)

<!-- END  GENERATED CONTENT -->

