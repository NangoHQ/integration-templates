<!-- BEGIN GENERATED CONTENT -->
# Create Task

## General Information

- **Description:** Creates a single task in Hubspot
- **Version:** 1.0.0
- **Group:** Others
- **Scopes:** `crm.objects.contacts.write, oauth`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/hubspot/actions/create-task.ts)


## Endpoint Reference

### Request Endpoint

`POST /tasks`

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

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/actions/create-task.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/actions/create-task.md)

<!-- END  GENERATED CONTENT -->

