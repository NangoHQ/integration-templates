<!-- BEGIN GENERATED CONTENT -->
# Update Employee

## General Information

- **Description:** Updates an employee in Gusto.
- **Version:** 0.0.1
- **Group:** Employees
- **Scopes:** `employees:manage`
- **Endpoint Type:** Action
- **Model:** `GustoUpdateEmployeeResponse`
- **Input Model:** `GustoUpdateEmployee`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/gusto/actions/update-employee.ts)


## Endpoint Reference

### Request Endpoint

`PUT /employees`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "id": "<string>",
  "version": "<string>",
  "firstName?": "<string>",
  "lastName?": "<string>",
  "email?": "<string>",
  "middleInitial?": "<string>",
  "preferredFirstName?": "<string>",
  "dateOfBirth?": "<string>",
  "ssn?": "<string>",
  "twoPercentShareholder?": "<boolean>"
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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/gusto/actions/update-employee.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/gusto/actions/update-employee.md)

<!-- END  GENERATED CONTENT -->

