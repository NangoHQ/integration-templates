# Delete Task

## General Information

- **Description:** Deletes a task in Hubspot
- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: crm.objects.contacts.write,oauth
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/hubspot/actions/delete-task.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** /tasks
- **Method:** DELETE

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
  "success": "<boolean>"
}
```
