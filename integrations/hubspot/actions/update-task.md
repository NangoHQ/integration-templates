<!-- BEGIN GENERATED CONTENT -->
# Update Task

## General Information

- **Description:** Updates a single company in Hubspot
- **Version:** 2.0.0
- **Group:** Tasks
- **Scopes:** `crm.objects.contacts.write, oauth`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_hubspot_updatetask`
- **Input Model:** `ActionInput_hubspot_updatetask`
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
  "task_type?": "<string>",
  "title?": "<string>",
  "priority?": "<string>",
  "assigned_to?": "<string>",
  "due_date?": "<string>",
  "notes?": "<string>",
  "associations?": [
    {
      "to": "<number>",
      "types": [
        {
          "association_category": "<string>",
          "association_type_Id": "<number>"
        }
      ]
    }
  ]
}
```

### Request Response

```json
{
  "id": "<string>",
  "task_type?": "<string>",
  "title?": "<string>",
  "priority?": "<string>",
  "assigned_to?": "<string>",
  "due_date?": "<string>",
  "notes?": "<string>",
  "associations?": [
    {
      "to": "<number>",
      "types": [
        {
          "association_category": "<string>",
          "association_type_Id": "<number>"
        }
      ]
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/actions/update-task.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/actions/update-task.md)

<!-- END  GENERATED CONTENT -->

