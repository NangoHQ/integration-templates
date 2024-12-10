# Articles

## General Information
- **Description:** Fetches a list of articles in Help center from Zendesk

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: hc:read
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/zendesk/syncs/articles.ts)

### Request Endpoint

- **Path:** `/articles`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "title": "<string>",
  "id": "<number>",
  "url": "<string>",
  "locale": "<string>",
  "user_segment_id": "<number | null>",
  "permission_group_id": "<number>",
  "author_id": "<number>",
  "body": "<string>",
  "comments_disabled": "<boolean>",
  "content_tag_ids": [
    "<number>"
  ],
  "created_at": "<string>",
  "draft": "<boolean>",
  "edited_at": "<string>",
  "html_url": "<string>",
  "label_names": [
    "<string>"
  ],
  "outdated": "<boolean>",
  "outdated_locales": [
    "<string>"
  ],
  "position": "<number>",
  "promoted": "<boolean>",
  "section_id": "<number>",
  "source_locale": "<string>",
  "updated_at": "<string>",
  "vote_count": "<number>",
  "vote_sum": "<number>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zendesk/syncs/articles.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zendesk/syncs/articles.md)

<!-- END  GENERATED CONTENT -->

undefined