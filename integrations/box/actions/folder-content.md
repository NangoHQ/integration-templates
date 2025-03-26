<!-- BEGIN GENERATED CONTENT -->
# Folder Content

## General Information

- **Description:** Fetches the top-level content (files and folders) of a folder given its ID. If no folder ID is provided, it fetches content from the root folder.
- **Version:** 1.0.0
- **Group:** Folders
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/box/actions/folder-content.ts)


## Endpoint Reference

### Request Endpoint

`GET /folder-content`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "id?": "<string>",
  "marker?": "<string>"
}
```

### Request Response

```json
{
  "files": [
    {
      "id": "<string>",
      "name": "<string>",
      "download_url": "<string>",
      "modified_at": "<string>"
    }
  ],
  "folders": [
    {
      "id": "<string>",
      "name": "<string>",
      "modified_at": "<string>",
      "url": "<string | null>"
    }
  ],
  "next_marker?": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/box/actions/folder-content.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/box/actions/folder-content.md)

<!-- END  GENERATED CONTENT -->

