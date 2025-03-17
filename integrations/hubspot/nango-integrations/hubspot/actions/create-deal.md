<!-- BEGIN GENERATED CONTENT -->
# Create Deal

## General Information

- **Description:** Creates a single deal in Hubspot
- **Version:** 0.0.1
- **Group:** Deals
- **Scopes:** `oauth, crm.objects.deals.write, oauth`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/hubspot/actions/create-deal.ts)


## Endpoint Reference

### Request Endpoint

`POST /deals`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "name?": "<string | undefined>",
  "amount?": "<string | undefined>",
  "close_date?": "<string | undefined>",
  "deal_description?": "<string | undefined>",
  "owner?": "<string | undefined>",
  "deal_stage?": "<string | undefined>",
  "deal_probability?": "<string | undefined>",
  "associations?": "<Association[] | undefined>"
}
```

### Request Response

```json
{
  "id": "<string>",
  "name?": "<string | undefined>",
  "amount?": "<string | undefined>",
  "close_date?": "<string | undefined>",
  "deal_description?": "<string | undefined>",
  "owner?": "<string | undefined>",
  "deal_stage?": "<string | undefined>",
  "deal_probability?": "<string | undefined>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/actions/create-deal.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/actions/create-deal.md)

<!-- END  GENERATED CONTENT -->

