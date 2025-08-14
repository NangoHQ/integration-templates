<!-- BEGIN GENERATED CONTENT -->
# Purchase Order Create

## General Information

- **Description:** Creates a purchase order in Netsuite
- **Version:** 2.0.0
- **Group:** Purchase Orders
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_netsuite_tba_purchaseordercreate`
- **Input Model:** `ActionInput_netsuite_tba_purchaseordercreate`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/netsuite-tba/actions/purchase-order-create.ts)


## Endpoint Reference

### Request Endpoint

`POST /purchase-orders`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "vendorId": "<string>",
  "currency?": "<string>",
  "description?": "<string>",
  "status": "<string>",
  "tranDate?": "<string>",
  "dueDate?": "<string>",
  "lines": [
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
      "inventoryDetail?": "<{\"binNumber?\":\"<string>\",\"expirationDate?\":\"<string>\",\"quantity?\":\"<number>\",\"serialNumber?\":\"<string>\",\"toBinNumber?\":\"<string>\"} | <null>>"
    }
  ],
  "customForm?": "<string>",
  "location?": "<string>",
  "subsidiary?": "<string>",
  "department?": "<string>",
  "class?": "<string>",
  "taxDetails?": "<{\"taxCode?\":\"<string>\",\"taxRate?\":\"<number>\"} | <null>>",
  "billingAddress": {
    "addr1?": "<string>",
    "addr2?": "<string>",
    "addr3?": "<string>",
    "city?": "<string>",
    "state?": "<string>",
    "zip?": "<string>",
    "country?": "<string>"
  },
  "shippingAddress": {
    "addr1?": "<string>",
    "addr2?": "<string>",
    "addr3?": "<string>",
    "city?": "<string>",
    "state?": "<string>",
    "zip?": "<string>",
    "country?": "<string>"
  }
}
```

### Request Response

```json
{
  "id": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/netsuite-tba/actions/purchase-order-create.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/netsuite-tba/actions/purchase-order-create.md)

<!-- END  GENERATED CONTENT -->

