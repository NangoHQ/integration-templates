# Shared Sites Selection

## General Information
- **Description:** This sync will be used to sync file metadata from SharePoint site based on the ones the user has picked.

- **Version:** 2.0.0
- **Group:** Others
- **Scopes:**: Sites.Read.All,Sites.Selected,MyFiles.Read,Files.Read.All,Files.Read.Selected,offline_access
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/sharepoint-online/syncs/shared-sites-selection.ts)

### Request Endpoint

- **Path:** `/shared-files/selected`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "siteId": "<string>",
  "id": "<string>",
  "name": "<string>",
  "etag": "<string>",
  "cTag": "<string>",
  "is_folder": "<boolean>",
  "mime_type": "<string | null>",
  "path": "<string>",
  "raw_source": "<object>",
  "updated_at": "<string>",
  "download_url": "<string | null>",
  "created_at": "<string>",
  "blob_size": "<number>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/sharepoint-online/syncs/shared-sites-selection.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/sharepoint-online/syncs/shared-sites-selection.md)

<!-- END  GENERATED CONTENT -->

undefined