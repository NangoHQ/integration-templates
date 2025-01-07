<!-- BEGIN GENERATED CONTENT -->
# Fetch Teams

## General Information

- **Description:** Fetches teams for an issue in Jira

- **Version:** 0.0.1
- **Group:** Issues
- **Scopes:** `read:jira-work`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/jira/actions/fetch-teams.ts)


## Endpoint Reference

### Request Endpoint

`GET /teams-list`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "id": "<string>"
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
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/jira/actions/fetch-teams.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/jira/actions/fetch-teams.md)

<!-- END  GENERATED CONTENT -->

