# Create Note

## General Information

- **Description:** Creates a single note in Hubspot
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `crm.objects.contacts.write, oauth`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/hubspot/actions/create-note.ts)


## Endpoint Reference

### Request Endpoint

- **Path:** `/note`
- **Method:** `POST`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "id?": "<string | undefined>",
  "time_stamp": "<string>",
  "created_date?": "<string | undefined>",
  "body?": "<string | undefined>",
  "attachment_ids?": "<string | undefined>",
  "owner?": "<string | undefined>",
  "associations?": "<Association[] | undefined>"
}
```

### Request Response

```json
{
  "id?": "<string | undefined>",
  "time_stamp": "<string>",
  "created_date?": "<string | undefined>",
  "body?": "<string | undefined>",
  "attachment_ids?": "<string | undefined>",
  "owner?": "<string | undefined>",
  "associations?": "<Association[] | undefined>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/actions/create-note.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/actions/create-note.md)

<!-- END  GENERATED CONTENT -->

