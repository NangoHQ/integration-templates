# Tasks

## General Information
- **Description:** Fetches a list of all your personal tasks in Zoho mail

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: ZohoMail.tasks.READ
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/zoho-mail/syncs/tasks.ts)

### Request Endpoint

- **Path:** `/zoho-mail/tasks`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "serviceType": "<number>",
  "modifiedTime": "<date>",
  "resourceId": "<string>",
  "attachments": [
    "<any>"
  ],
  "statusStr": "<string>",
  "statusValue": "<number>",
  "description": "<string>",
  "project": {
    "name": "<string>",
    "id": "<string>"
  },
  "isTaskPublished": "<boolean>",
  "title": "<string>",
  "createdAt": "<date>",
  "portalId": "<number>",
  "serviceId": "<string>",
  "owner": {
    "name": "<string>",
    "id": "<number>"
  },
  "assigneeList": [
    "<string>"
  ],
  "dependency": [
    "<any>"
  ],
  "subtasks": [
    "<any>"
  ],
  "priority": "<string>",
  "tags": [
    "<string>"
  ],
  "followers": [
    "<string>"
  ],
  "namespaceId": "<string>",
  "dependents": [
    "<string>"
  ],
  "assignee": {
    "name": "<string>",
    "id": "<number>"
  },
  "serviceUniqId": "<number>",
  "depUniqId": "<string>",
  "status": "<string>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zoho-mail/syncs/tasks.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zoho-mail/syncs/tasks.md)

<!-- END  GENERATED CONTENT -->

undefined