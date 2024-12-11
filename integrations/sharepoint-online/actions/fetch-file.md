# Fetch File

## General Information

- **Description:** This action will be used to fetch the latest file download_url which can be used to download the actual file.

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:** `MyFiles.Read, offline_access`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/sharepoint-online/actions/fetch-file.ts)


## Endpoint Reference

### Request Endpoint

- **Path:** `/fetch-file`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "siteId": "<string>",
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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/sharepoint-online/actions/fetch-file.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/sharepoint-online/actions/fetch-file.md)

<!-- END  GENERATED CONTENT -->

