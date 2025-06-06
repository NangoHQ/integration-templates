<!-- BEGIN GENERATED CONTENT -->
# Bill Create

## General Information

- **Description:** Creates a vendor bill in Netsuite.

- **Version:** 1.0.1
- **Group:** Bills
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `NetsuiteBillCreateOutput`
- **Input Model:** `NetsuiteBillCreateInput`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/netsuite-tba/actions/bill-create.ts)


## Endpoint Reference

### Request Endpoint

`POST /bills`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "vendorId": "<string>",
  "tranDate": "<string>",
  "currency": "<string>",
  "dueDate?": "<string>",
  "status?": "<string>",
  "memo?": "<string>",
  "externalId?": "<string>",
  "location?": "<string>",
  "subsidiary?": "<string>",
  "department?": "<string>",
  "class?": "<string>",
  "terms?": "<string>",
  "lines": [
    {
      "itemId": "<string>",
      "quantity": "<number>",
      "amount": "<number>",
      "description?": "<string>",
      "rate?": "<number>",
      "locationId?": "<string>",
      "departmentId?": "<string>",
      "classId?": "<string>",
      "customerId?": "<string>",
      "isBillable?": "<boolean>",
      "taxDetails?": {
        "taxCode?": "<string>",
        "taxRate?": "<number>"
      },
      "inventoryDetail?": {
        "binNumber?": "<string>",
        "expirationDate?": "<string>",
        "quantity?": "<number>",
        "serialNumber?": "<string>"
      }
    }
  ],
  "billingAddress?": {
    "addr1?": "<string>",
    "addr2?": "<string>",
    "addr3?": "<string>",
    "city?": "<string>",
    "state?": "<string>",
    "zip?": "<string>",
    "country?": "<string>"
  },
  "taxDetails?": {
    "taxCode?": "<string>",
    "taxRate?": "<number>"
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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/netsuite-tba/actions/bill-create.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/netsuite-tba/actions/bill-create.md)

<!-- END  GENERATED CONTENT -->

