<!-- BEGIN GENERATED CONTENT -->
# Create Issue

## General Information

- **Description:** An action that creates an Issue on Jira
- **Version:** 2.0.0
- **Group:** Issues
- **Scopes:** `write:jira-work`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_jira_createissue`
- **Input Model:** `ActionInput_jira_createissue`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/jira/actions/create-issue.ts)


## Endpoint Reference

### Request Endpoint

`POST /issues`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "summary": "<string>",
  "description?": "<string>",
  "assignee?": "<string>",
  "labels?": "<string[]>",
  "project": "<string>",
  "issueType": "<string>"
}
```

### Request Response

```json
{
  "id": "<string>",
  "key": "<string>",
  "self": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/jira/actions/create-issue.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/jira/actions/create-issue.md)

<!-- END  GENERATED CONTENT -->

