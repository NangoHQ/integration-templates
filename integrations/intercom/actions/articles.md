# Articles

## General Information
- **Description:** Fetches a list of articles from Intercom

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/intercom/syncs/articles.ts)

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
  "type": "<string>",
  "id": "<string>",
  "workspace_id": "<string>",
  "title": "<string>",
  "description": "<string | null>",
  "body": "<string | null>",
  "author_id": "<number>",
  "state": "<string>",
  "created_at": "<string>",
  "updated_at": "<string>",
  "url": "<string | null>",
  "parent_id": "<number | null>",
  "parent_ids": [
    "<number>"
  ],
  "parent_type": "<string | null>",
  "default_locale?": "<string | undefined>",
  "translated_content?": "<TranslatedContent | null | undefined>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/intercom/syncs/articles.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/intercom/syncs/articles.md)

<!-- END  GENERATED CONTENT -->

undefined