<!-- BEGIN GENERATED CONTENT -->
# Update Task

## General Information

- **Description:** Updates a single company in Hubspot
- **Version:** 1.0.1
- **Group:** Tasks
- **Scopes:** `crm.objects.contacts.write, oauth`
- **Endpoint Type:** Action
- **Model:** `UpdateTaskInput`
- **Input Model:** `CreateUpdateTaskOutput`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/hubspot/actions/update-task.ts)


## Endpoint Reference

### Request Endpoint

`PATCH /tasks`

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
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/actions/update-task.md)

<!-- END  GENERATED CONTENT -->

