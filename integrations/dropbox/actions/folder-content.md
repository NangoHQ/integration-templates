<!-- BEGIN GENERATED CONTENT -->
# Folder Content

## General Information

- **Description:** Fetches the top-level content (files and folders) of a Dropbox folder.
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `files.metadata.read`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/dropbox/actions/folder-content.ts)


## Endpoint Reference

### Request Endpoint

`POST /folder-content`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "path": "<string | undefined>",
  "cursor": "<string | undefined>"
}
```

### Request Response

```json
{
  "folders": [
    {
      "id": "<string>",
      "path": "<string>",
      "title": "<string>",
      "modified_date": "<string>"
    }
  ],
  "files": [
    {
      "id": "<string>",
      "path": "<string>",
      "title": "<string>",
      "modified_date": "<string>"
    }
  ],
  "cursor": "<string | undefined>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/dropbox/actions/folder-content.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/dropbox/actions/folder-content.md)

<!-- END  GENERATED CONTENT -->

