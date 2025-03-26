<!-- BEGIN GENERATED CONTENT -->
# List Drives

## General Information

- **Description:** Lists the available drives for the authenticated user.

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `Files.Read, offline_access`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/one-drive/actions/list-drives.ts)


## Endpoint Reference

### Request Endpoint

`GET /list-drives`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

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

