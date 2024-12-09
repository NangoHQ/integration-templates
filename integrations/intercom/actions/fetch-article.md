# Fetch Article

## General Information

- **Description:** Fetch a single article from Intercom
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/intercom/actions/fetch-article.ts)

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
