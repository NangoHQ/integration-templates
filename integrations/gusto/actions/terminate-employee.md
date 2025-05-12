<!-- BEGIN GENERATED CONTENT -->
# Terminate Employee

## General Information

- **Description:** Terminates an employee in Gusto.
- **Version:** 0.0.1
- **Group:** Employees
- **Scopes:** `employments:write`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/gusto/actions/terminate-employee.ts)


## Endpoint Reference

### Request Endpoint

`DELETE /employees`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "id": "<string>",
  "effectiveDate?": "<string>",
  "runTerminationPayroll?": "<boolean>"
}
```

### Request Response

```json
{
  "success": "<boolean>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/gusto/actions/terminate-employee.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/gusto/actions/terminate-employee.md)

<!-- END  GENERATED CONTENT -->

