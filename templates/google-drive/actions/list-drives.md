<!-- BEGIN GENERATED CONTENT -->
# List Drives

## General Information

- **Description:** Lists all shared drives the user has access to. Returns paginated results with up to 100 drives per page.
- **Version:** 1.0.0
- **Group:** Drives
- **Scopes:** `https://www.googleapis.com/auth/drive.readonly`
- **Endpoint Type:** Action
- **Model:** `DriveListResponse`
- **Input Model:** `ListDrivesInput`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/google-drive/actions/list-drives.ts)


## Endpoint Reference

### Request Endpoint

`GET /drives`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "cursor": "<string | undefined>"
}
```

### Request Response

```json
{
  "drives": [
    {
      "id": "<string>",
      "name": "<string>",
      "kind": "<string>",
      "createdTime": "<string>",
      "hidden": "<boolean | undefined>",
      "capabilities": "<DriveCapabilities | undefined>",
      "restrictions": "<DriveRestrictions | undefined>"
    }
  ],
  "next_cursor": "<string | undefined>",
  "kind": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/google-drive/actions/list-drives.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/google-drive/actions/list-drives.md)

<!-- END  GENERATED CONTENT -->

