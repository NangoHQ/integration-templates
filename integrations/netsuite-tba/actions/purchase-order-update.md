<!-- BEGIN GENERATED CONTENT -->
# Purchase Order Update

## General Information

- **Description:** Updates an existing purchase order in Netsuite.
- **Version:** 1.0.0
- **Group:** Purchase Orders
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/netsuite-tba/actions/purchase-order-update.ts)


## Endpoint Reference

### Request Endpoint

`PUT /purchase-orders`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "id": "<string>",
  "vendorId?": "<string>",
  "currency?": "<string>",
  "description?": "<string>",
  "status?": "<string>",
  "tranDate?": "<string>",
  "dueDate?": "<string>",
  "lines?": [
    {
      "itemId": "<string>",
      "quantity": "<number>",
      "amount": "<number>",
      "description?": "<string>",
      "locationId?": "<string>",
      "rate?": "<number>",
      "department?": "<string>",
      "class?": "<string>",
      "createWorkOrder?": "<boolean>",
      "inventoryDetail?": "<InventoryDetail | null>"
    }
  ],
  "customForm?": "<string>",
  "location?": "<string>",
  "subsidiary?": "<string>",
  "department?": "<string>",
  "class?": "<string>",
  "billingAddress?": "<Address | null>",
  "shippingAddress?": "<Address | null>",
  "taxDetails?": "<TaxDetails | null>"
}
```

### Request Response

```json
{
  "success": "<boolean>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/netsuite-tba/actions/purchase-order-update.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/netsuite-tba/actions/purchase-order-update.md)

<!-- END  GENERATED CONTENT -->

