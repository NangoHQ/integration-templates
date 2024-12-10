# Deals

## General Information
- **Description:** Fetches a list of deals from Hubspot with their associated companies and contacts

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: crm.objects.deals.read,oauth,e-commerce (standard scope),crm.objects.line_items.read (granular scope)
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/hubspot/syncs/deals.ts)

### Request Endpoint

- **Path:** `/deals`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "name": "<string | null>",
  "amount": "<string | null>",
  "close_date": "<string | null>",
  "deal_description": "<string | null>",
  "owner": "<string | null>",
  "deal_stage": "<string | null>",
  "deal_probability": "<string | null>",
  "returned_associations?": "<ReturnedAssociations | undefined>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/syncs/deals.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/syncs/deals.md)

<!-- END  GENERATED CONTENT -->

undefined