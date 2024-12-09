# Delete Contact

## General Information

- **Description:** Delete a single contact in salesforce
- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: offline_access,api
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/salesforce-sandbox/actions/delete-contact.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** /contacts
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
