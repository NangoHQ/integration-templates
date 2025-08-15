<!-- BEGIN GENERATED CONTENT -->
# Fetch Teams

## General Information

- **Description:** Fetch teams in an organisation in Jira
- **Version:** 1.0.0
- **Group:** Teams
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_jira_basic_fetchteams`
- **Input Model:** `ActionInput_jira_basic_fetchteams`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/jira-basic/actions/fetch-teams.ts)


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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/jira-basic/actions/fetch-teams.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/jira-basic/actions/fetch-teams.md)

<!-- END  GENERATED CONTENT -->

