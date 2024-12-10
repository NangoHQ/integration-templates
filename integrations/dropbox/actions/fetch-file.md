# Fetch File

## General Information

- **Description:** Fetches the content of a file given its ID, processes the data using a response stream, and encodes it into a base64 string. This base64-encoded string can be used to recreate the file in its original format using an external tool.
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: files.content.read
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/dropbox/actions/fetch-file.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** `/fetch-file`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

```json
"<string>"
```

### Request Response

```json
"<string>"
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/dropbox/actions/fetch-file.ts)
-- [ReadMe History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/dropbox/actions/fetch-file.md)
