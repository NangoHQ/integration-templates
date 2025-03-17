<!-- BEGIN GENERATED CONTENT -->
# Fetch Document

## General Information

- **Description:** Fetches the content of a file given its ID, processes the data using
a response stream, and encodes it into a base64 string. This base64-encoded
string can be used to recreate the file in its original format using an external tool.
If this is a native google file type then use the fetch-google-sheet or fetch-google-doc
actions.

- **Version:** 2.0.1
- **Group:** Documents
- **Scopes:** `https://www.googleapis.com/auth/drive.readonly`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/google-drive/actions/fetch-document.ts)


## Endpoint Reference

### Request Endpoint

`GET /fetch-document`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "id": "<string>"
}
```

### Request Response

```json
"<string>"
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/google-drive/actions/fetch-document.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/google-drive/actions/fetch-document.md)

<!-- END  GENERATED CONTENT -->
## Limitations

- **File Size:** The file size must not exceed 10MB.
