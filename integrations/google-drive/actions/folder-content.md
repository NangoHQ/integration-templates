<!-- BEGIN GENERATED CONTENT -->
# Folder Content

## General Information

- **Description:** Fetches the top-level content (files and folders) of a folder given its ID.
If no folder ID is provided, it fetches content from the root folder.

- **Version:** 1.0.0
- **Group:** Folders
- **Scopes:** `https://www.googleapis.com/auth/drive.readonly`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/google-drive/actions/folder-content.ts)


## Endpoint Reference

### Request Endpoint

`GET /folder-content`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "id?": "<string>",
  "cursor?": "<string>"
}
```

### Request Response

```json
{
  "files": [
    {
      "id": "<string>",
      "name": "<string>",
      "mimeType": "<string>",
      "parents?": [
        "<string>"
      ],
      "modifiedTime?": "<string>",
      "createdTime?": "<string>",
      "webViewLink?": "<string>",
      "kind?": "<string>"
    }
  ],
  "folders": [
    {
      "id": "<string>",
      "name": "<string>",
      "mimeType": "<string>",
      "parents?": [
        "<string>"
      ],
      "modifiedTime?": "<string>",
      "createdTime?": "<string>",
      "webViewLink?": "<string>",
      "kind?": "<string>"
    }
  ],
  "next_cursor?": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/google-drive/actions/folder-content.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/google-drive/actions/folder-content.md)

<!-- END  GENERATED CONTENT -->

