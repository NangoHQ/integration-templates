<!-- BEGIN GENERATED CONTENT -->
# Fetch Article

## General Information

- **Description:** Fetch a single full help center article
- **Version:** 1.0.0
- **Group:** Others
- **Scopes:** `hc:read`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_zendesk_fetcharticle`
- **Input Model:** `ActionInput_zendesk_fetcharticle`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/zendesk/actions/fetch-article.ts)


## Endpoint Reference

### Request Endpoint

`GET /single-article`

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
    "title": "<string>",
    "id": "<string>",
    "url": "<string>",
    "locale": "<string>",
    "user_segment_id": "<number | null>",
    "permission_group_id": "<number>",
    "author_id": "<number>",
    "body": "<string>",
    "comments_disabled": "<boolean>",
    "content_tag_ids": "<number[]>",
    "created_at": "<string>",
    "draft": "<boolean>",
    "edited_at": "<string>",
    "html_url": "<string>",
    "label_names": "<string[]>",
    "outdated": "<boolean>",
    "outdated_locales": "<string[]>",
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

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zendesk/actions/fetch-article.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zendesk/actions/fetch-article.md)

<!-- END  GENERATED CONTENT -->

