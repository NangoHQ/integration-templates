<!-- BEGIN GENERATED CONTENT -->
# Folder Content

## General Information

- **Description:** Fetches the top-level content (files and folders) of a Google Drive folder.
- **Version:** 0.0.1
- **Group:** Others
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
  "folderId": "<string | undefined>",
  "nextPageToken": "<string | undefined>"
}
```

### Request Response

```json
{
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
  "nextPageToken": "<string | undefined>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/google-drive/actions/folder-content.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/google-drive/actions/folder-content.md)

<!-- END  GENERATED CONTENT -->

