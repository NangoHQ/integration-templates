<!-- BEGIN GENERATED CONTENT -->
# Write File

## General Information

- **Description:** Write content to a particular github file within a repo. If
the file doesn't exist it creates and then writes to it
- **Version:** 2.0.0
- **Group:** Files
- **Scopes:** `repo`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_github_writefile`
- **Input Model:** `ActionInput_github_writefile`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/github/actions/write-file.ts)


## Endpoint Reference

### Request Endpoint

`PUT /files`

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
  "sha": "<string>"
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

