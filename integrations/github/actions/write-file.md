# Write File

## General Information

- **Description:** Write content to a particular github file within a repo. If
the file doesn't exist it creates and then writes to it

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: repo
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/github/actions/write-file.ts)


## Endpoint Reference

### Request Endpoint

- **Path:** `/files`
- **Method:** `PUT`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "owner": "<string>",
  "repo": "<string>",
  "path": "<string>",
  "message": "<string>",
  "content": "<string>",
  "sha": "<string | undefined>"
}
```

### Request Response

```json
{
  "url": "<string>",
  "status": "<string>",
  "sha": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/github/actions/write-file.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/github/actions/write-file.md)

<!-- END  GENERATED CONTENT -->















