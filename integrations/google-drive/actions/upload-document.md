<!-- BEGIN GENERATED CONTENT -->
# Upload Document

## General Information

- **Description:** Uploads a file to Google Drive. The file is uploaded to the root directory
of the authenticated user's Google Drive account. If a folder ID is provided,
the file is uploaded to the specified folder.

- **Version:** 1.0.0
- **Group:** Documents
- **Scopes:** `https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/google-drive/actions/upload-document.ts)


## Endpoint Reference

### Request Endpoint

`POST /upload-document`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "content": "<string>",
  "name": "<string>",
  "mimeType": "<string>",
  "folderId?": "<string | undefined>",
  "description?": "<string | undefined>",
  "isBase64?": "<boolean | undefined>"
}
```

### Request Response

```json
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
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/google-drive/actions/upload-document.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/google-drive/actions/upload-document.md)

<!-- END  GENERATED CONTENT -->

