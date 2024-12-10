# Tasks

## General Information
- **Description:** Fetches a list of tasks from Hubspot

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: crm.objects.contacts.read,oauth
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/hubspot/syncs/tasks.ts)

### Request Endpoint

- **Path:** `/tasks`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "task_type": "<string | null>",
  "title": "<string | null>",
  "priority": "<string| null>",
  "assigned_to": "<string | null>",
  "due_date": "<string | null>",
  "notes": "<string | null>",
  "returned_associations?": "<ReturnedAssociations | undefined>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/syncs/tasks.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/syncs/tasks.md)

<!-- END  GENERATED CONTENT -->

undefined