<!-- BEGIN GENERATED CONTENT -->
# Transactions

## General Information

- **Description:** List all transactions with a default backfill date of one year.
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `undefined`
- **Endpoint Type:** Sync
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/avalara-sandbox/syncs/transactions.ts)


## Endpoint Reference

### Request Endpoint

`GET /transactions`

### Request Query Parameters

- **modified_after:** `(optional, string)` A timestamp (e.g., `2023-05-31T11:46:13.390Z`) used to fetch records modified after this date and time. If not provided, all records are returned. The modified_after parameter is less precise than cursor, as multiple records may share the same modification timestamp.
- **limit:** `(optional, integer)` The maximum number of records to return per page. Defaults to 100.
- **cursor:** `(optional, string)` A marker used to fetch records modified after a specific point in time.If not provided, all records are returned.Each record includes a cursor value found in _nango_metadata.cursor.Save the cursor from the last record retrieved to track your sync progress.Use the cursor parameter together with the limit parameter to paginate through records.The cursor is more precise than modified_after, as it can differentiate between records with the same modification timestamp.
- **filter:** `(optional, added | updated | deleted)` Filter to only show results that have been added or updated or deleted.

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "code": "<string>",
  "companyId": "<number>",
  "date": "<string>",
  "paymentDate": "<string>",
  "status": "<string>",
  "type": "<string>",
  "batchCode": "<string>",
  "currencyCode": "<string>",
  "exchangeRateCurrencyCode": "<string>",
  "customerUsageType": "<string>",
  "entityUseCode": "<string>",
  "customerVendorCode": "<string>",
  "customerCode": "<string>",
  "exemptNo": "<string>",
  "reconciled": "<boolean>",
  "locationCode": "<string>",
  "reportingLocationCode": "<string>",
  "purchaseOrderNo": "<string>",
  "referenceCode": "<string>",
  "salespersonCode": "<string>",
  "taxOverrideType": "<string>",
  "taxOverrideAmount": "<number>",
  "taxOverrideReason": "<string>",
  "totalAmount": "<number>",
  "totalExempt": "<number>",
  "totalDiscount": "<number>",
  "totalTax": "<number>",
  "totalTaxable": "<number>",
  "totalTaxCalculated": "<number>",
  "adjustmentReason": "<string>",
  "adjustmentDescription": "<string>",
  "locked": "<boolean>",
  "region": "<string>",
  "country": "<string>",
  "version": "<number>",
  "softwareVersion": "<string>",
  "originAddressId": "<number>",
  "destinationAddressId": "<number>",
  "exchangeRateEffectiveDate": "<string>",
  "exchangeRate": "<number>",
  "isSellerImporterOfRecord": "<boolean>",
  "description": "<string>",
  "email": "<string>",
  "businessIdentificationNo": "<string>",
  "modifiedDate": "<string>",
  "modifiedUserId": "<number>",
  "taxDate": "<string>",
  "lines": [
    {
      "id": "<number>",
      "transactionId": "<number>",
      "lineNumber": "<string>",
      "boundaryOverrideId": "<number>",
      "entityUseCode": "<string>",
      "description": "<string>",
      "destinationAddressId": "<number>",
      "originAddressId": "<number>",
      "discountAmount": "<number>",
      "discountTypeId": "<number>",
      "exemptAmount": "<number>",
      "exemptCertId": "<number>",
      "exemptNo": "<string>",
      "isItemTaxable": "<boolean>",
      "isSSTP": "<boolean>",
      "itemCode": "<string>",
      "lineAmount": "<number>",
      "quantity": "<number>",
      "ref1": "<string>",
      "reportingDate": "<string>",
      "revAccount": "<string>",
      "sourcing": "<string>",
      "tax": "<number>",
      "taxableAmount": "<number>",
      "taxCalculated": "<number>",
      "taxCode": "<string>",
      "taxDate": "<string>",
      "taxEngine": "<string>",
      "taxOverrideType": "<string>",
      "taxOverrideAmount": "<number>",
      "taxOverrideReason": "<string>",
      "taxIncluded": "<boolean>",
      "details": [
        {
          "id": "<number>",
          "transactionLineId": "<number>",
          "transactionId": "<number>",
          "addressId": "<number>",
          "country": "<string>",
          "region": "<string>",
          "stateFIPS": "<string>",
          "exemptAmount": "<number>",
          "exemptReasonId": "<number>",
          "exemptRuleId": "<number>",
          "inState": "<boolean>",
          "jurisCode": "<string>",
          "jurisName": "<string>",
          "jurisdictionId": "<number>",
          "signatureCode": "<string>",
          "stateAssignedNo": "<string>",
          "jurisType": "<string>",
          "nonTaxableAmount": "<number>",
          "nonTaxableRuleId": "<number>",
          "nonTaxableType": "<string>",
          "rate": "<number>",
          "rateRuleId": "<number>",
          "rateSourceId": "<number>",
          "serCode": "<string>",
          "sourcing": "<string>",
          "tax": "<number>",
          "taxableAmount": "<number>",
          "taxType": "<string>",
          "taxName": "<string>",
          "taxAuthorityTypeId": "<number>",
          "taxRegionId": "<number>",
          "taxCalculated": "<number>",
          "taxOverride": "<number>",
          "rateType": "<string>",
          "taxableUnits": "<number>",
          "nonTaxableUnits": "<number>",
          "exemptUnits": "<number>",
          "reportingTaxableUnits": "<number>",
          "reportingNonTaxableUnits": "<number>",
          "reportingExemptUnits": "<number>",
          "reportingTax": "<number>",
          "reportingTaxCalculated": "<number>",
          "recoverabilityPercentage": "<number>",
          "recoverableAmount": "<number>",
          "nonRecoverableAmount": "<number>"
        }
      ],
      "vatNumberTypeId": "<number>",
      "recoverabilityPercentage": "<number>",
      "recoverableAmount": "<number>",
      "nonRecoverableAmount": "<number>"
    }
  ],
  "locationTypes": [
    "<any>"
  ],
  "messages": [
    "<string>"
  ],
  "summary": [
    "<string>"
  ],
  "addresses?": [
    {
      "id": "<number>",
      "transactionId": "<number>",
      "boundaryLevel": "<string>",
      "line1": "<string>",
      "city": "<string>",
      "region": "<string>",
      "postalCode": "<string>",
      "country": "<string>",
      "taxRegionId": "<number>"
    }
  ],
  "taxDetailsByTaxType?": [
    {
      "taxType": "<string>",
      "totalTaxable": "<number>",
      "totalExempt": "<number>",
      "totalNonTaxable": "<number>",
      "totalTax": "<number>"
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/avalara-sandbox/syncs/transactions.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/avalara-sandbox/syncs/transactions.md)

<!-- END  GENERATED CONTENT -->

