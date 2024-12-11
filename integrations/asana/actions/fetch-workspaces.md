# Fetch Workspaces

## General Information

- **Description:** Fetch the workspaces with a limit (default 10) of a user to allow them to selection of projects to sync
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `undefined`
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/asana/actions/fetch-workspaces.ts)


## Endpoint Reference

### Request Endpoint

- **Path:** `/workspaces/limit`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "limit": "<number | undefined>"
}
```

### Request Response

```json
[
  {
    "gid": "<string>",
    "resource_type": "<string>",
    "name": "<string>"
  }
]
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/asana/actions/fetch-workspaces.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/asana/actions/fetch-workspaces.md)

<!-- END  GENERATED CONTENT -->

