# Create User

## General Information

- **Description:** Creates a user in Harvest
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `administrator, manager`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/harvest/actions/create-user.ts)


## Endpoint Reference

### Request Endpoint

`POST /users`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "first_name": "<string>",
  "last_name": "<string>",
  "email": "<string>",
  "timezone?": "<string>",
  "has_access_to_all_future_projects?": "<boolean>",
  "is_contractor?": "<boolean>",
  "is_active?": "<boolean>",
  "weekly_capacity?": "<integer>",
  "default_hourly_rate?": "<decimal>",
  "cost_rate?": "<decimal>",
  "roles?": [
    "<string>"
  ],
  "access_roles?": "<administrator | manager | member | project_creator | billable_rates_manager | managed_projects_invoice_drafter | managed_projects_invoice_manager | client_and_task_manager | time_and_expenses_manager | estimates_manager>"
}
```

### Request Response

```json
{
  "id": "<string>",
  "email": "<string>",
  "firstName": "<string>",
  "lastName": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/harvest/actions/create-user.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/harvest/actions/create-user.md)

<!-- END  GENERATED CONTENT -->

