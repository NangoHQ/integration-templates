<!-- BEGIN GENERATED CONTENT -->
# Create Journal Entry

## General Information

- **Description:** Creates a single journal entry in QuickBooks.
- **Version:** 1.0.0
- **Group:** Journal Entries
- **Scopes:** `com.intuit.quickbooks.accounting`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_quickbooks_createjournalentry`
- **Input Model:** `ActionInput_quickbooks_createjournalentry`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/quickbooks/actions/create-journal-entry.ts)


## Endpoint Reference

### Request Endpoint

`POST /journal-entries`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "line_items": [
    {
      "detail_type": "<string>",
      "amount": "<number>",
      "project_ref": {
        "name?": "<string>",
        "value": "<string>"
      },
      "description?": "<string>",
      "line_num?": "<number>",
      "journal_entry_line_detail": {
        "journal_code_ref": {
          "name?": "<string>",
          "value": "<string>"
        },
        "posting_type": "<enum: 'Debit' | 'Credit'>",
        "account_ref": {
          "name?": "<string>",
          "value": "<string>"
        },
        "tax_applicable_on?": "<string>",
        "entity?": {
          "type?": "<string>",
          "entity_ref": {
            "name?": "<string>",
            "value": "<string>"
          }
        },
        "tax_inclusive_amt?": "<number>",
        "class_ref": {
          "name?": "<string>",
          "value": "<string>"
        },
        "department_ref": {
          "name?": "<string>",
          "value": "<string>"
        },
        "tax_code_ref": {
          "name?": "<string>",
          "value": "<string>"
        },
        "billable_status?": "<string>",
        "tax_amount?": "<number>"
      }
    }
  ],
  "journal_code_ref": {
    "name?": "<string>",
    "value": "<string>"
  },
  "currency_ref": {
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
  "note?": "<string>",
  "lines": [
    {
      "id": "<string>",
      "type": "<string>",
      "account_id": "<string>",
      "account_name": "<string>",
      "net_amount": "<number>",
      "posting_type": "<enum: 'Debit' | 'Credit'>",
      "description": "<string>",
      "entity_type?": "<string>",
      "entity_type_id?": "<string>",
      "entity_type_name?": "<string>",
      "department_id?": "<string>",
      "department_name?": "<string>",
      "class_id?": "<string>",
      "class_name?": "<string>"
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks/actions/create-journal-entry.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks/actions/create-journal-entry.md)

<!-- END  GENERATED CONTENT -->

