<!-- BEGIN GENERATED CONTENT -->
# List Drives

## General Information

- **Description:** Lists the available drives for the authenticated user.
- **Version:** 1.0.0
- **Group:** Drives
- **Scopes:** `Files.Read, offline_access`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_one_drive_listdrives`
- **Input Model:** `ActionInput_one_drive_listdrives`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/one-drive/actions/list-drives.ts)


## Endpoint Reference

### Request Endpoint

`GET /list-drives`

### Request Query Parameters

_No request parameters_

### Request Body

```json
"<null>"
```

### Request Response

```json
{
  "drives": [
    {
      "id": "<string>",
      "name": "<string>",
      "createdDateTime": "<string>",
      "webUrl": "<string>"
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/one-drive/actions/list-drives.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/one-drive/actions/list-drives.md)

<!-- END  GENERATED CONTENT -->

