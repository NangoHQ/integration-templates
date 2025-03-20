<!-- BEGIN GENERATED CONTENT -->
# Folder Content

## General Information

- **Description:** Fetches the top-level content (files and folders) of a folder given its ID.
If no folder ID is provided, it fetches content from the root folder.

- **Version:** 1.0.0
- **Group:** Folders
- **Scopes:** `Sites.Read.All, Sites.Selected, MyFiles.Read, Files.Read.All, Files.Read.Selected, offline_access`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/sharepoint-online/actions/folder-content.ts)


## Endpoint Reference

### Request Endpoint

`GET /folder-content`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "siteId?": "<string>",
  "itemId?": "<string>",
  "nextLink?": "<string>"
}
```

### Request Response

```json
{
  "files": [
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
  ],
  "folders": [
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
  ],
  "nextLink?": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/sharepoint-online/actions/folder-content.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/sharepoint-online/actions/folder-content.md)

<!-- END  GENERATED CONTENT -->

