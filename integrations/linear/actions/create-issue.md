<!-- BEGIN GENERATED CONTENT -->
# Create Issue

## General Information

- **Description:** Create an issue in Linear
- **Version:** 1.0.1
- **Group:** Issues
- **Scopes:** `issues:create`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/linear/actions/create-issue.ts)


## Endpoint Reference

### Request Endpoint

`POST /issues`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "teamId": "<string>",
  "title": "<string>",
  "description?": "<string>",
  "projectId?": "<string>",
  "milestoneId?": "<string>",
  "assigneeId?": "<string>",
  "priority?": "<number>",
  "parentId?": "<string>",
  "estimate?": "<number>",
  "dueDate?": "<string>"
}
```

### Request Response

```json
{
  "id": "<string>",
  "assigneeId": "<string | null>",
  "creatorId": "<string | null>",
  "createdAt": "<string>",
  "updatedAt": "<string>",
  "description": "<string | null>",
  "dueDate": "<string | null>",
  "projectId": "<string | null>",
  "teamId": "<string>",
  "title": "<string>",
  "status": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/linear/actions/create-issue.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/linear/actions/create-issue.md)

<!-- END  GENERATED CONTENT -->

