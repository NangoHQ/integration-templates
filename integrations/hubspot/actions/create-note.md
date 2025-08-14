<!-- BEGIN GENERATED CONTENT -->
# Create Note

## General Information

- **Description:** Creates a single note in Hubspot
- **Version:** 1.0.0
- **Group:** Others
- **Scopes:** `crm.objects.contacts.write, oauth`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_hubspot_createnote`
- **Input Model:** `ActionInput_hubspot_createnote`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/hubspot/actions/create-note.ts)


## Endpoint Reference

### Request Endpoint

`POST /note`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "id?": "<string>",
  "time_stamp": "<string>",
  "created_date?": "<string>",
  "body?": "<string>",
  "attachment_ids?": "<string>",
  "owner?": "<string>",
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
  "id?": "<string>",
  "time_stamp": "<string>",
  "created_date?": "<string>",
  "body?": "<string>",
  "attachment_ids?": "<string>",
  "owner?": "<string>",
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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/actions/create-note.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/actions/create-note.md)

<!-- END  GENERATED CONTENT -->

