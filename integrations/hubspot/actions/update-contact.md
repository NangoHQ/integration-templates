<!-- BEGIN GENERATED CONTENT -->
# Update Contact

## General Information

- **Description:** Updates a single contact in Hubspot
- **Version:** 1.0.0
- **Group:** Contacts
- **Scopes:** `crm.objects.contacts.write, oauth`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_hubspot_updatecontact`
- **Input Model:** `ActionInput_hubspot_updatecontact`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/hubspot/actions/update-contact.ts)


## Endpoint Reference

### Request Endpoint

`PATCH /contact`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "first_name?": "<string>",
  "last_name?": "<string>",
  "email?": "<string>",
  "job_title?": "<string>",
  "lead_status?": "<string>",
  "lifecycle_stage?": "<string>",
  "salutation?": "<string>",
  "mobile_phone_number?": "<string>",
  "website_url?": "<string>",
  "owner?": "<string>",
  "id": "<string>"
}
```

### Request Response

```json
{
  "id": "<string>",
  "created_date": "<string>",
  "first_name?": "<string>",
  "last_name?": "<string>",
  "email?": "<string>",
  "job_title?": "<string>",
  "last_contacted?": "<string>",
  "last_activity_date?": "<string>",
  "lead_status?": "<string>",
  "lifecycle_stage?": "<string>",
  "salutation?": "<string>",
  "mobile_phone_number?": "<string>",
  "website_url?": "<string>",
  "owner?": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/actions/update-contact.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/actions/update-contact.md)

<!-- END  GENERATED CONTENT -->

