<!-- BEGIN GENERATED CONTENT -->
# Create Contact

## General Information

- **Description:** Creates a new external contact in RingCentral.
- **Version:** 1.0.0
- **Group:** Contacts
- **Scopes:** `Contacts`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_ring_central_createcontact`
- **Input Model:** `ActionInput_ring_central_createcontact`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/ring-central/actions/create-contact.ts)


## Endpoint Reference

### Request Endpoint

`POST /contacts`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "firstName?": "<string>",
  "lastName?": "<string>",
  "email?": "<string>",
  "phoneNumbers": [
    {
      "type": "<enum: 'work' | 'mobile' | 'other'>",
      "value": "<string>"
    }
  ],
  "company?": "<string>",
  "jobTitle?": "<string>",
  "notes?": "<string>"
}
```

### Request Response

```json
{
  "id": "<string>",
  "firstName?": "<string>",
  "lastName?": "<string>",
  "email?": "<string>",
  "phoneNumbers?": [
    {
      "type": "<enum: 'work' | 'mobile' | 'other'>",
      "value": "<string>"
    }
  ],
  "company?": "<string>",
  "jobTitle?": "<string>",
  "notes?": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/ring-central/actions/create-contact.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/ring-central/actions/create-contact.md)

<!-- END  GENERATED CONTENT -->

