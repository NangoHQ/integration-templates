<!-- BEGIN GENERATED CONTENT -->
# Fetch File

## General Information

- **Description:** Fetches the content of a file given its ID, processes the data using a response stream, and encodes it into a base64 string. This base64-encoded string can be used to recreate the file in its original format using an external tool.
- **Version:** 2.0.0
- **Group:** Files
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_box_fetchfile`
- **Input Model:** `ActionInput_box_fetchfile`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/box/actions/fetch-file.ts)


## Endpoint Reference

### Request Endpoint

`GET /file`

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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/box/actions/fetch-file.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/box/actions/fetch-file.md)

<!-- END  GENERATED CONTENT -->

