<!-- BEGIN GENERATED CONTENT -->
# Create Employee

## General Information

- **Description:** Creates an employee in Gusto.
- **Version:** 0.0.1
- **Group:** Employees
- **Scopes:** `employees:manage`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/gusto/actions/create-employee.ts)


## Endpoint Reference

### Request Endpoint

`POST /employees`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "firstName": "<string>",
  "lastName": "<string>",
  "email": "<string>",
  "middleInitial?": "<string>",
  "preferredFirstName?": "<string>",
  "dateOfBirth": "<string>",
  "ssn?": "<string>",
  "selfOnboarding?": "<boolean>"
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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/gusto/actions/create-employee.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/gusto/actions/create-employee.md)

<!-- END  GENERATED CONTENT -->

