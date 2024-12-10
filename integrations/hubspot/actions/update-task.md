# Update Task

## General Information

- **Description:** Updates a single company in Hubspot
- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: crm.objects.contacts.write,oauth
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/hubspot/actions/update-task.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** `/tasks`
- **Method:** `PATCH`

### Request Query Parameters

_No request parameters_

### Request Body

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

### Request Response

```json
{
  "task_type?": "<string | undefined>",
  "title?": "<string | undefined>",
  "priority?": "<string| undefined>",
  "assigned_to?": "<string | undefined>",
  "due_date?": "<string | undefined>",
  "notes?": "<string | undefined>",
  "associations?": "<Association[] | undefined>",
  "id": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/actions/update-task.ts)
-- [ReadMe History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/actions/update-task.md)
