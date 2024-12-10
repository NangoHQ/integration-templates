# Contacts

## General Information
- **Description:** Fetches a list of contacts from salesforce

- **Version:** 1.0.3
- **Group:** Others
- **Scopes:**: offline_access,api
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/salesforce-sandbox/syncs/contacts.ts)

### Request Endpoint

- **Path:** `/contacts`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "first_name": "<string | null>",
  "last_name": "<string>",
  "account_name": "<string | null>",
  "account_id": "<string | null>",
  "email": "<string | null>",
  "owner_id": "<string>",
  "owner_name": "<string>",
  "mobile": "<string | null>",
  "phone": "<string | null>",
  "salutation": "<string | null>",
  "title": "<string | null>",
  "last_modified_date": "<string>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce-sandbox/syncs/contacts.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce-sandbox/syncs/contacts.md)

<!-- END  GENERATED CONTENT -->



undefined