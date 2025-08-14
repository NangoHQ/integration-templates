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
- **Model:** `ActionOutput_google_drive_uploaddocument`
- **Input Model:** `ActionInput_google_drive_uploaddocument`
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
  "folderId?": "<string>",
  "description?": "<string>",
  "isBase64?": "<boolean>"
}
```

### Request Response

```json
{
  "id": "<string>",
  "name": "<string>",
  "mimeType": "<string>",
  "parents": "<string[]>",
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
## Example Inputs for Successful Action

### Example Input with Base64 Encoded Content

```json
{
  "content": "bGFuZ2NoYWluDQpsbGFtYSBpbmRleA0KDQpvbGFtYQ0KDQp1c2UgZXhpc3RpbmcgdG9vbA0K",
  "name": "Test File in Base 64",
  "mimeType": "text/plain",
  "folderId": "1g2eXDrTRfBqZoAzVwLvEY7F9E9IoGx97",
  "description": "Small test file Uploaded via Nango",
  "isBase64": true
}
```

### Example Input with Plain Text Content

```json
{
  "content": "Hello World\n",
  "name": "Test File",
  "folderId": "1g2eXDrTRfBqZoAzVwLvEY7F9E9IoGx97",
  "mimeType": "text/plain",
  "description": "Uploaded via Nango"
}
```
## Limitations

- **File Size:** Uploads larger than 5MB are not supported.
