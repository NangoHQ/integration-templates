<!-- BEGIN GENERATED CONTENT -->
# Create Deal

## General Information

- **Description:** Creates a single deal in Hubspot
- **Version:** 2.0.0
- **Group:** Deals
- **Scopes:** `oauth, crm.objects.deals.write, oauth`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_hubspot_createdeal`
- **Input Model:** `ActionInput_hubspot_createdeal`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/hubspot/actions/create-deal.ts)


## Endpoint Reference

### Request Endpoint

`POST /deals`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "name?": "<string>",
  "amount?": "<string>",
  "close_date?": "<string>",
  "deal_description?": "<string>",
  "owner?": "<string>",
  "deal_stage?": "<string>",
  "deal_probability?": "<string>",
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
  "id": "<string>",
  "name?": "<string>",
  "amount?": "<string>",
  "close_date?": "<string>",
  "deal_description?": "<string>",
  "owner?": "<string>",
  "deal_stage?": "<string>",
  "deal_probability?": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/actions/create-deal.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/actions/create-deal.md)

<!-- END  GENERATED CONTENT -->

