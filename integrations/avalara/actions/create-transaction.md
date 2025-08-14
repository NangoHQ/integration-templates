<!-- BEGIN GENERATED CONTENT -->
# Create Transaction

## General Information

- **Description:** Creates a new transaction
- **Version:** 2.0.0
- **Group:** Transactions
- **Scopes:** `AccountAdmin,  AccountOperator,  AccountUser,  BatchServiceAdmin,  CompanyAdmin,  CompanyUser,  CSPTester,  SSTAdmin,  TechnicalSupportAdmin,  TechnicalSupportUser`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_avalara_createtransaction`
- **Input Model:** `ActionInput_avalara_createtransaction`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/avalara/actions/create-transaction.ts)


## Endpoint Reference

### Request Endpoint

`POST /transactions`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "invoice": {
    "id": "<string>",
    "invoiceNumber": "<string>",
    "emissionDate": "<string>",
    "dueDate": "<string>",
    "status": "<enum: 'to_pay' | 'partially_paid' | 'paid' | 'late' | 'grace_period' | 'to_pay_batch' | 'voided'>",
    "taxRate": "<string>",
    "currency": "<string>",
    "invoiceLineItems": [
      {
        "id?": "<string>",
        "billingItemId?": "<string | null>",
        "name": "<string>",
        "description": "<string | null>",
        "unitsCount": "<number>",
        "unitAmount": "<string>",
        "taxAmount": "<number>",
        "taxRate": "<string>",
        "amount?": "<number>",
        "amountExcludingTax": "<number>",
        "periodStart": "<string | null>",
        "periodEnd": "<string | null>",
        "invoiceLineItemTiers": [
          {
            "unitCount": "<string>",
            "unitAmount": "<string>",
            "totalAmount": "<number>"
          }
        ]
      }
    ],
    "coupons": [
      {
        "name": "<string>",
        "discountAmount": "<number>"
      }
    ],
    "type": "<enum: 'invoice' | 'refund'>",
    "discountAmount": "<number>"
  },
  "externalCustomerId": "<string>",
  "companyCode?": "<string>",
  "addresses": {
    "singleLocation": {
      "line1?": "<string>",
      "city?": "<string>",
      "region?": "<string>",
      "country?": "<string>",
      "postalCode?": "<string>"
    },
    "shipFrom": {
      "line1?": "<string>",
      "city?": "<string>",
      "region?": "<string>",
      "country?": "<string>",
      "postalCode?": "<string>"
    },
    "shipTo": {
      "line1?": "<string>",
      "city?": "<string>",
      "region?": "<string>",
      "country?": "<string>",
      "postalCode?": "<string>"
    },
    "pointOfOrderOrigin": {
      "line1?": "<string>",
      "city?": "<string>",
      "region?": "<string>",
      "country?": "<string>",
      "postalCode?": "<string>"
    },
    "pointOfOrderAcceptance": {
      "line1?": "<string>",
      "city?": "<string>",
      "region?": "<string>",
      "country?": "<string>",
      "postalCode?": "<string>"
    },
    "goodsPlaceOrServiceRendered": {
      "line1?": "<string>",
      "city?": "<string>",
      "region?": "<string>",
      "country?": "<string>",
      "postalCode?": "<string>"
    },
    "import": {
      "line1?": "<string>",
      "city?": "<string>",
      "region?": "<string>",
      "country?": "<string>",
      "postalCode?": "<string>"
    },
    "billTo": {
      "line1?": "<string>",
      "city?": "<string>",
      "region?": "<string>",
      "country?": "<string>",
      "postalCode?": "<string>"
    }
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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/avalara/actions/create-transaction.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/avalara/actions/create-transaction.md)

<!-- END  GENERATED CONTENT -->

