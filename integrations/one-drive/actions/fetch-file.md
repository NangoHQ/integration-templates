<!-- BEGIN GENERATED CONTENT -->
# Fetch File

## General Information

- **Description:** This action will be used to fetch the latest file download_url which can be used to download the actual file.
- **Version:** 2.0.0
- **Group:** Files
- **Scopes:** `Files.Read, offline_access`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_one_drive_fetchfile`
- **Input Model:** `ActionInput_one_drive_fetchfile`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/one-drive/actions/fetch-file.ts)


## Endpoint Reference

### Request Endpoint

`GET /fetch-file`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "driveId": "<string>",
  "itemId": "<string>"
}
```

### Request Response

```json
{
  "id": "<string>",
  "download_url": "<string | null>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/one-drive/actions/fetch-file.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/one-drive/actions/fetch-file.md)

<!-- END  GENERATED CONTENT -->

