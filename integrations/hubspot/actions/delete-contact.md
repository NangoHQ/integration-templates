# Delete Contact

## General Information

- **Description:** Deletes a contact in Hubspot
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: crm.objects.contacts.write,oauth
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/hubspot/actions/delete-contact.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** `/contact`
- **Method:** `DELETE`

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
