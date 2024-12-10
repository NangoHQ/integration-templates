# Content Metadata

## General Information
- **Description:** Sync pages and databases metadata to further fetch the content
using a dedicated action

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/notion/syncs/content-metadata.ts)

### Request Endpoint

- **Path:** `/metadata`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "path?": "<string>",
  "type": "<page | database>",
  "last_modified": "<string>",
  "title?": "<string>",
  "parent_id?": "<string | undefined>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/notion/syncs/content-metadata.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/notion/syncs/content-metadata.md)

<!-- END  GENERATED CONTENT -->

undefined