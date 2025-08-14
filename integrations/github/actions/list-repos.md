<!-- BEGIN GENERATED CONTENT -->
# List Repos

## General Information

- **Description:** List github repos from an organization.
- **Version:** 2.0.0
- **Group:** Others
- **Scopes:** `read:org`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_github_listrepos`
- **Input Model:** `ActionInput_github_listrepos`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/github/actions/list-repos.ts)


## Endpoint Reference

### Request Endpoint

`GET /github/list-repos`

### Request Query Parameters

_No request parameters_

### Request Body

```json
"<null>"
```

### Request Response

```json
{
  "repos": [
    {
      "id": "<number>",
      "owner": "<string>",
      "name": "<string>",
      "full_name": "<string>",
      "description": "<string>",
      "url": "<string>",
      "date_created": "<Date>",
      "date_last_modified": "<Date>"
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/github/actions/list-repos.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/github/actions/list-repos.md)

<!-- END  GENERATED CONTENT -->

