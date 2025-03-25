<!-- BEGIN GENERATED CONTENT -->
# Create Journal Entry

## General Information

- **Description:** Creates a single journal entry in QuickBooks.

- **Version:** 0.0.1
- **Group:** Journal Entries
- **Scopes:** `com.intuit.quickbooks.accounting`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/quickbooks/actions/create-journal-entry.ts)


## Endpoint Reference

### Request Endpoint

`POST /journal-entries`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "line_items": {
    "0": {
      "detail_type": "<string>",
      "amount": "<number>",
      "project_ref?": {
        "name?": "<string>",
        "value": "<string>"
      },
      "description?": "<string>",
      "line_num?": "<number>",
      "journal_entry_line_detail": {
        "journal_code_ref?": {
          "name?": "<string>",
          "value": "<string>"
        },
        "posting_type": "<Debit | Credit>",
        "account_ref": {
          "name?": "<string>",
          "value": "<string>"
        },
        "tax_applicable_on?": "<string>",
        "entity?": {
          "type?": "<string>",
          "entity_ref?": {
            "name?": "<string>",
            "value": "<string>"
          }
        },
        "tax_inclusive_amt?": "<number>",
        "class_ref?": {
          "name?": "<string>",
          "value": "<string>"
        },
        "department_ref?": {
          "name?": "<string>",
          "value": "<string>"
        },
        "tax_code_ref?": {
          "name?": "<string>",
          "value": "<string>"
        },
        "billable_status?": "<string>",
        "tax_amount?": "<number>"
      }
    }
  },
  "journal_code_ref?": {
    "name?": "<string>",
    "value": "<string>"
  },
  "currency_ref?": {
    "name?": "<string>",
    "value": "<string>"
  }
}
```

### Request Response

```json
{
  "created_at": "<string>",
  "updated_at": "<string>",
  "id": "<string>",
  "date": "<string | null>",
  "currency": "<string>",
  "note?": "<string | undefined>",
  "lines": [
    {
      "id": "<string>",
      "type": "<string>",
      "account_id": "<string>",
      "account_name": "<string>",
      "net_amount": "<number>",
      "posting_type": "<Debit | Credit>",
      "description": "<string>",
      "entity_type?": "<string | undefined>",
      "entity_type_id?": "<string | undefined>",
      "entity_type_name?": "<string | undefined>",
      "department_id?": "<string | undefined>",
      "department_name?": "<string | undefined>",
      "class_id?": "<string | undefined>",
      "class_name?": "<string | undefined>"
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks/actions/create-journal-entry.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks/actions/create-journal-entry.md)

<!-- END  GENERATED CONTENT -->

