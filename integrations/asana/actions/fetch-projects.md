<!-- BEGIN GENERATED CONTENT -->
# Fetch Projects

## General Information

- **Description:** Fetch the projects with a limit (default 10) given a workspace of a user to allow selection when choosing the tasks to sync.
- **Version:** 1.0.0
- **Group:** Others
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `BaseAsanaModel[]`
- **Input Model:** `AsanaProjectInput`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/asana/actions/fetch-projects.ts)


## Endpoint Reference

### Request Endpoint

`GET /projects/limit`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "limit": "<number | undefined>",
  "workspace": "<string>"
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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/asana/actions/fetch-projects.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/asana/actions/fetch-projects.md)

<!-- END  GENERATED CONTENT -->

