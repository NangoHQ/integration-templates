<!-- BEGIN GENERATED CONTENT -->
# Folder Content

## General Information

- **Description:** Fetches the top-level content (files and folders) of a Dropbox folder given its path. If no path is provided, it fetches content from the root folder.
- **Version:** 2.0.0
- **Group:** Folders
- **Scopes:** `files.metadata.read`
- **Endpoint Type:** Action
- **Model:** `FolderContent`
- **Input Model:** `FolderContentInput`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/dropbox/actions/folder-content.ts)


## Endpoint Reference

### Request Endpoint

`POST /folder-content`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "path?": "<string>",
  "cursor?": "<string>"
}
```

### Request Response

```json
{
  "files": [
    {
      "id": "<string>",
      "path": "<string>",
      "title": "<string>",
      "modified_date": "<string>"
    }
  ],
  "folders": [
    {
      "id": "<string>",
      "path": "<string>",
      "title": "<string>",
      "modified_date": "<string>"
    }
  ],
  "next_cursor?": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/dropbox/actions/folder-content.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/dropbox/actions/folder-content.md)

<!-- END  GENERATED CONTENT -->

