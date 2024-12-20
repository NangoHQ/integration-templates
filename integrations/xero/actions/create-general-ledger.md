<!-- BEGIN GENERATED CONTENT -->
# Create General Ledger

## General Information

- **Description:** Create a general ledger netry

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `accounting.transactions`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/xero/actions/create-general-ledger.ts)


## Endpoint Reference

### Request Endpoint

`POST /general-ledger`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "description": "<string>",
  "lines": [
    {
      "lineAmount": "<number>",
      "accountCode": "<string>"
    }
  ],
  "date?": "<string>"
}
```

### Request Response

```json
{
  "id": "<string>",
  "date": "<string>",
  "number": "<number>",
  "createdDateUTC": "<string>",
  "lines": [
    {
      "journalLineId": "<string>",
      "accountId": "<string>",
      "accountCode": "<string>",
      "accountName": "<string>",
      "description": "<string>",
      "netAmount": "<number>",
      "grossAmount": "<number>",
      "taxAmount": "<number>",
      "taxType": "<string>",
      "taxName": "<string>",
      "trackingCategories": [
        "<string>"
      ]
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/xero/actions/create-general-ledger.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/xero/actions/create-general-ledger.md)

<!-- END  GENERATED CONTENT -->

