# Documents

## General Information
- **Description:** Sync the metadata of a specified file or folders from Google Drive,
handling both individual files and nested folders.
Metadata required to filter on a particular folder, or file(s). Metadata
fields should be {"files": ["<some-id>"]} OR
{"folders": ["<some-id>"]}. The ID should be able to be provided
by using the Google Picker API
(https://developers.google.com/drive/picker/guides/overview)
and using the ID field provided by the response
(https://developers.google.com/drive/picker/reference/results)

- **Version:** 1.0.3
- **Group:** Others
- **Scopes:**: https://www.googleapis.com/auth/drive.readonly
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/google-drive/syncs/documents.ts)

### Request Endpoint

- **Path:** `/documents`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "url": "<string>",
  "title": "<string>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/google-drive/syncs/documents.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/google-drive/syncs/documents.md)

<!-- END  GENERATED CONTENT -->

undefined