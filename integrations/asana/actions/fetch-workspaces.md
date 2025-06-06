<!-- BEGIN GENERATED CONTENT -->
# Fetch Workspaces

## General Information

- **Description:** Fetch the workspaces with a limit (default 10) of a user to allow them to selection of projects to sync
- **Version:** 1.0.0
- **Group:** Others
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `BaseAsanaModel[]`
- **Input Model:** `Limit`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/asana/actions/fetch-workspaces.ts)


## Endpoint Reference

### Request Endpoint

`GET /workspaces/limit`

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

