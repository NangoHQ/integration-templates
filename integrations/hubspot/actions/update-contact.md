<!-- BEGIN GENERATED CONTENT -->
# Update Contact

## General Information

- **Description:** Updates a single contact in Hubspot
- **Version:** 0.0.1
- **Group:** Contacts
- **Scopes:** `crm.objects.contacts.write, oauth`
- **Endpoint Type:** Action
- **Model:** `CreateUpdateContactOutput`
- **Input Model:** `UpdateContactInput`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/hubspot/actions/update-contact.ts)


## Endpoint Reference

### Request Endpoint

`PATCH /contact`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "first_name?": "<string | undefined>",
  "last_name?": "<string | undefined>",
  "email?": "<string | undefined>",
  "job_title?": "<string | undefined>",
  "lead_status?": "<string | undefined>",
  "lifecycle_stage?": "<string | undefined>",
  "salutation?": "<string | undefined>",
  "mobile_phone_number?": "<string | undefined>",
  "website_url?": "<string | undefined>",
  "owner?": "<string | undefined>",
  "id": "<string>"
}
```

### Request Response

```json
{
  "id": "<string>",
  "created_date": "<string>",
  "first_name?": "<string | undefined>",
  "last_name?": "<string  | undefined>",
  "email?": "<string | undefined>",
  "job_title?": "<string | undefined>",
  "last_contacted?": "<string | undefined>",
  "last_activity_date?": "<string | undefined>",
  "lead_status?": "<string | undefined>",
  "lifecycle_stage?": "<string | undefined>",
  "salutation?": "<string | undefined>",
  "mobile_phone_number?": "<string | undefined>",
  "website_url?": "<string | undefined>",
  "owner?": "<string | undefined>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/actions/update-contact.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/actions/update-contact.md)

<!-- END  GENERATED CONTENT -->

