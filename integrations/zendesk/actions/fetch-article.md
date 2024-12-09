# Fetch Article

## General Information

- **Description:** Fetch a single full help center article
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: hc:read
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/zendesk/actions/fetch-article.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** /single-article
- **Method:** GET

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "id": "<string>"
}
```

### Request Response

```json
{
  "article": {
    "__extends": {
      "title": "<string>",
      "id": "<string>",
      "url": "<string>"
    },
    "id": "<number>",
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
}
```
