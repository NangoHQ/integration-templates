<!-- BEGIN GENERATED CONTENT -->
# Fetch Teams

## General Information

- **Description:** Fetch the teams from Linear
- **Version:** 0.0.1
- **Group:** Teams
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `TeamsPaginatedResponse`
- **Input Model:** `FetchTeamsInput`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/linear/actions/fetch-teams.ts)


## Endpoint Reference

### Request Endpoint

`GET /teams/list`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "after?": "<string>",
  "pageSize?": "<number>"
}
```

### Request Response

```json
{
  "teams": [
    {
      "id": "<string>",
      "name": "<string>"
    }
  ],
  "pageInfo": {
    "hasNextPage": "<boolean>",
    "endCursor": "<string | null>"
  }
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/linear/actions/fetch-teams.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/linear/actions/fetch-teams.md)

<!-- END  GENERATED CONTENT -->

