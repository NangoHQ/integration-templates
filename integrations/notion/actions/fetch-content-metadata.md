# Fetch Content Metadata

## General Information

- **Description:** Retrieve the entity type as well as an id for a Notion entity to later call
fetch-database or fetch-rich-page based on the type.

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/notion/actions/fetch-content-metadata.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** `/fetch-content-metadata`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "url?": "<string>",
  "id?": "<string>"
}
```

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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/notion/actions/fetch-content-metadata.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/notion/actions/fetch-content-metadata.md)
