# Create Transaction

## General Information

- **Description:** Creates a new transaction

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `AccountAdmin, AccountOperator, AccountUser, BatchServiceAdmin, CompanyAdmin, CompanyUser, CSPTester, SSTAdmin, TechnicalSupportAdmin, TechnicalSupportUser`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/avalara-sandbox/actions/create-transaction.ts)


## Endpoint Reference

### Request Endpoint

- **Path:** `/transactions`
- **Method:** `POST`

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
    "status": "<to_pay | partially_paid | paid | late | grace_period | to_pay_batch | voided>",
    "taxRate": "<string>",
    "currency": "<string>",
    "invoiceLineItems": [
      {
        "id?": "<string | undefined>",
        "billingItemId?": "<string | null | undefined>",
        "name": "<string>",
        "description": "<string | null>",
        "unitsCount": "<number>",
        "unitAmount": "<string>",
        "taxAmount": "<number>",
        "taxRate": "<string>",
        "amount?": "<number | undefined>",
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
    "type": "<invoice | refund>",
    "discountAmount": "<number>"
  },
  "externalCustomerId": "<string>",
  "companyCode?": "<string>",
  "addresses": {
    "singleLocation?": {
      "line1?": "<string>",
      "city?": "<string>",
      "region?": "<string>",
      "country?": "<string>",
      "postalCode?": "<string>"
    },
    "shipFrom?": {
      "line1?": "<string>",
      "city?": "<string>",
      "region?": "<string>",
      "country?": "<string>",
      "postalCode?": "<string>"
    },
    "shipTo?": {
      "line1?": "<string>",
      "city?": "<string>",
      "region?": "<string>",
      "country?": "<string>",
      "postalCode?": "<string>"
    },
    "pointOfOrderOrigin?": {
      "line1?": "<string>",
      "city?": "<string>",
      "region?": "<string>",
      "country?": "<string>",
      "postalCode?": "<string>"
    },
    "pointOfOrderAcceptance?": {
      "line1?": "<string>",
      "city?": "<string>",
      "region?": "<string>",
      "country?": "<string>",
      "postalCode?": "<string>"
    },
    "goodsPlaceOrServiceRendered?": {
      "line1?": "<string>",
      "city?": "<string>",
      "region?": "<string>",
      "country?": "<string>",
      "postalCode?": "<string>"
    },
    "import?": {
      "line1?": "<string>",
      "city?": "<string>",
      "region?": "<string>",
      "country?": "<string>",
      "postalCode?": "<string>"
    },
    "billTo?": {
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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/avalara-sandbox/actions/create-transaction.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/avalara-sandbox/actions/create-transaction.md)

<!-- END  GENERATED CONTENT -->

