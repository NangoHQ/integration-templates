# User Files

## General Information
- **Description:** Fetch all files from the user's drive and sync the metadata for each file.
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: Sites.Read.All,Sites.Selected,MyFiles.Read,Files.Read.All,Files.Read.Selected,offline_access
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/sharepoint-online/syncs/user-files.ts)

### Request Endpoint

- **Path:** `/user-files`
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


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/sharepoint-online/syncs/user-files.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/sharepoint-online/syncs/user-files.md)

<!-- END  GENERATED CONTENT -->

undefined