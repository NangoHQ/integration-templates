<!-- BEGIN GENERATED CONTENT -->
# Fetch Content Metadata

## General Information

- **Description:** Retrieve the entity type as well as an id for a Notion entity to later call
fetch-database or fetch-rich-page based on the type.
- **Version:** 2.0.0
- **Group:** Contents
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_notion_fetchcontentmetadata`
- **Input Model:** `ActionInput_notion_fetchcontentmetadata`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/notion/actions/fetch-content-metadata.ts)


## Endpoint Reference

### Request Endpoint

`GET /contents/single`

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
  "type": "<enum: 'page' | 'database'>",
  "last_modified": "<string>",
  "title?": "<string>",
  "parent_id?": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/notion/actions/fetch-content-metadata.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/notion/actions/fetch-content-metadata.md)

<!-- END  GENERATED CONTENT -->

