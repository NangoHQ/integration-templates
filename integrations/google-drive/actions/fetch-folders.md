<!-- BEGIN GENERATED CONTENT -->
# Fetch Folders

## General Information

- **Description:** Fetches the content of a folder given its ID. The output is a
list of folders within the specified folder if an id is provided.
If no id is provided, the output is a list of folders at the root level.

- **Version:** 1.0.0
- **Group:** Folders
- **Scopes:** `https://www.googleapis.com/auth/drive.readonly`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/google-drive/actions/fetch-folders.ts)


## Endpoint Reference

### Request Endpoint

`GET /fetch-folders`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "id?": "<string>",
  "nextPageToken?": "<string | undefined>"
}
```

### Request Response

```json
{
  "folders?": [
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
  "nextPageToken?": "<string | undefined>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/google-drive/actions/fetch-folders.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/google-drive/actions/fetch-folders.md)

<!-- END  GENERATED CONTENT -->

