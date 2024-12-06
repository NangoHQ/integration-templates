# Users

## General Information

- **Description:** Continuously fetches users from either Microsoft 365 or Azure Active
Directory given specified
groups to sync. Expects an `orgsToSync` metadata property with an
array of organization ids.
Details: full refresh, doesn't support deletes, goes back all time,
metadata is required.

- **Group:** Others
- **Scopes:**: User.Read.All
- **Endpoint Type:** Sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/microsoft-teams/syncs/users.ts)
