# Contacts

## General Information
- **Description:** Fetches a list of contacts from Hubspot

- **Version:** 2.0.1
- **Group:** Others
- **Scopes:**: crm.objects.contacts.read,oauth
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/hubspot/syncs/contacts.ts)

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
  "created_date": "<string>",
  "first_name": "<string | null>",
  "last_name": "<string  | null>",
  "email": "<string | null>",
  "job_title": "<string | null>",
  "last_contacted": "<string | null>",
  "last_activity_date": "<string | null>",
  "lead_status": "<string | null>",
  "lifecycle_stage": "<string | null>",
  "salutation": "<string | null>",
  "mobile_phone_number": "<string | null>",
  "website_url": "<string | null>",
  "owner": "<string | null>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/syncs/contacts.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/syncs/contacts.md)

<!-- END  GENERATED CONTENT -->

undefined