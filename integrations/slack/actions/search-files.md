<!-- BEGIN GENERATED CONTENT -->
# Search Files

## General Information

- **Description:** Searches for files matching a query in Slack workspace (requires user token).
- **Version:** 1.0.0
- **Group:** Search
- **Scopes:** `search:read`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_slack_searchfiles`
- **Input Model:** `ActionInput_slack_searchfiles`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/search-files.ts)


## Endpoint Reference

### Request Endpoint

`GET /search-files`

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
  "files": {
    "total": "<number>",
    "matches": [
      {
        "id": "<string>",
        "name": "<string>",
        "title": "<string>",
        "mimetype": "<string>",
        "filetype": "<string>",
        "size": "<number>",
        "url_private": "<string>",
        "permalink": "<string>",
        "timestamp": "<number>"
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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/search-files.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/search-files.md)

<!-- END  GENERATED CONTENT -->

