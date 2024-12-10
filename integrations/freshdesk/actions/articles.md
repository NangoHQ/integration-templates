# Articles

## General Information
- **Description:** Recursively fetches a list of solution articles.

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/freshdesk/syncs/articles.ts)

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
  "created_at": "<string>",
  "updated_at": "<string>",
  "id": "<number>",
  "type": "<number>",
  "category_id": "<number>",
  "folder_id": "<number>",
  "hierarchy": [
    {
      "level": "<number>",
      "type": "<string>",
      "data": {
        "id": "<number>",
        "name": "<string>",
        "language": "<string>"
      }
    }
  ],
  "thumbs_up": "<number>",
  "thumbs_down": "<number>",
  "hits": "<number>",
  "tags?": "<string[] | undefined>",
  "seo_data": {
    "meta_title?": "<string | undefined>",
    "meta_description?": "<string | undefined>",
    "meta_keywords?": "<string | undefined>"
  },
  "agent_id": "<number>",
  "title": "<string>",
  "description": "<string>",
  "description_text": "<string>",
  "status": "<number>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/freshdesk/syncs/articles.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/freshdesk/syncs/articles.md)

<!-- END  GENERATED CONTENT -->

undefined