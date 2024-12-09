# Create Task

## General Information

- **Description:** Creates a single task in Hubspot
- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: crm.objects.contacts.write,oauth
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/hubspot/actions/create-task.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** `/tasks`
- **Method:** `POST`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "task_type?": "<string | undefined>",
  "title?": "<string | undefined>",
  "priority?": "<string| undefined>",
  "assigned_to?": "<string | undefined>",
  "due_date?": "<string | undefined>",
  "notes?": "<string | undefined>",
  "associations?": "<Association[] | undefined>"
}
```

### Request Response

```json
{
  "id": "<string>",
  "task_type?": "<string | undefined>",
  "title?": "<string | undefined>",
  "priority?": "<string| undefined>",
  "assigned_to?": "<string | undefined>",
  "due_date?": "<string | undefined>",
  "notes?": "<string | undefined>",
  "associations?": "<Association[] | undefined>"
}
```
