# Writing Scripts
This is a general guide to writing scripts both in this repo and in a custom nango integrations repo.

## Configuration - nango.yaml

- If `sync_type: full`, then the sync should also have `track_deletes: true`
- If the sync requires metadata, then the sync should be set to `auto_start: false`. The metadata should be documented as an input in the nango.yaml
- Scopes should be documented
- For optional properties in models, use the `?` suffix after the property name
- Endpoints should be concise and simple, not necessarily reflecting the exact third-party API path
- Model names and endpoint paths should not be duplicated within an integration
- When adding a new integration, take care to not remove unrelated entries in the nango.yaml

### Endpoint Naming Guidelines

Keep endpoint definitions simple and consistent:

```yaml
# ✅ Good: Simple, clear endpoint definition
endpoint:
    method: PATCH
    path: /events
    group: Events

# ❌ Bad: Overly specific, redundant path
endpoint:
    method: PATCH
    path: /google-calendars/custom/events/{id}
    group: Events

# ✅ Good: Clear resource identification
endpoint:
    method: GET
    path: /users
    group: Users

# ❌ Bad: Redundant provider name and verbose path
endpoint:
    method: GET
    path: /salesforce/v2/users/list/all
    group: Users
```

```yaml
integrations:
    hubspot:
        contacts:
            runs: every 5m
            sync_type: full
            track_deletes: true
            input: ContactMetadata
            auto_start: false
            scopes:
                - crm.objects.contacts.read
            description: A super informative and helpful description that tells us what the sync does.
            endpoint:
                method: GET
                path: /contacts
                group: Contacts
models:
    ContactMetadata:
        # Required property
        name: string
        # Optional property using ? suffix
        cursor?: string
        # Optional property with union type
        type?: 'user' | 'admin'
```

## Scripts

### General Guidelines

- Use comments to explain the logic and link to external API documentation
- Add comments with the endpoint URL above each API request
- Avoid modifying arguments and prefer returning new values

### API Endpoints and Base URLs

When constructing API endpoints, always check the official providers.yaml configuration at:
[https://github.com/NangoHQ/nango/blob/master/packages/providers/providers.yaml](https://github.com/NangoHQ/nango/blob/master/packages/providers/providers.yaml)

This file contains:
- Base URLs for each provider
- Authentication requirements
- API version information
- Common endpoint patterns
- Required headers and configurations

Example of using providers.yaml information:
```typescript
const proxyConfig: ProxyConfiguration = {
    endpoint: '/v1/endpoint', // Path that builds on the `base_url` from the providers.yaml
    retries: 3,
    headers: {
        'Content-Type': 'application/json'
    }
};
```

### Imports and Types

- Add a `types.ts` file which contains typed third party API responses
  - Types in `types.ts` should be prefixed with the integration name (e.g., `GoogleUserResponse`, `AsanaTaskResponse`) as they represent the raw API responses
  - This helps avoid naming conflicts with the user-facing types defined in `nango.yaml`
- Models defined in `nango.yaml` are automatically generated into a `models.ts` file
  - Always import these types from the models file instead of redefining them in your scripts
- For non-type imports (functions, classes, etc.), always include the `.js` extension:

```typescript
// ❌ Don't omit .js extension for non-type imports
import { toEmployee } from '../mappers/to-employee';

// ✅ Do include .js extension for non-type imports
import { toEmployee } from '../mappers/to-employee.js';

// ✅ Type imports don't need .js extension
import type { TaskResponse } from '../../models';
```

- Follow proper type naming and importing conventions:

```typescript
// ❌ Don't define interfaces that match nango.yaml models
interface TaskResponse {
    tasks: Task[];
}

// ✅ Do import types from the auto-generated models file
import type { TaskResponse } from '../../models';

// ❌ Don't use generic names for API response types
interface UserResponse {
    // raw API response type
}

// ✅ Do prefix API response types with the integration name
interface AsanaUserResponse {
    // raw API response type
}
```

### API Calls and Configuration

- Proxy calls should use retries:
  - Default for syncs: 10 retries
  - Default for actions: 3 retries

```typescript
const proxyConfig: ProxyConfiguration = {
    retries: 10,
    // ... other config
};
```

- Use `await nango.log` for logging (avoid `console.log`)
- Use the `params` property instead of appending params to the endpoint
- Use the built-in `nango.paginate` wherever possible:

```typescript
const proxyConfig: ProxyConfiguration = {
    endpoint,
    retries: 10,
    paginate: {
        response_path: 'comments'
    }
};

for await (const pages of nango.paginate(proxyConfig)) {
    // ... handle pages
}
```

- Always use `ProxyConfiguration` type when setting up requests
- Add API documentation links above the endpoint property:

```typescript
const proxyConfig: ProxyConfiguration = {
    // https://www.great-api-docs.com/endpoint
    endpoint,
    retries: 10,
};
```

## Validation

- Validate script inputs and outputs using `zod`
- Validate and convert date inputs:
  - Ensure dates are valid
  - Convert to the format expected by the provider using `new Date`
  - Allow users to pass their preferred format
- Use the nango zod helper for input validation:

```typescript
const parseResult = await nango.zodValidateInput({
    zodSchema: documentInputSchema,
    input,
});
```

## Syncs

- `fetchData` must be the default export at the top of the file
- Always paginate requests to retrieve all records
- Avoid parallelizing requests (defeats retry policy and rate limiting)
- Do not wrap syncs in try-catch blocks (Nango handles error reporting)
- Use dedicated mapper functions for data transformation:
  - Place shared mappers in a `mappers` directory
  - Name files as `mappers/to-${entity}` (e.g., `mappers/to-employee.ts`)

```typescript
import { toEmployee } from '../mappers/to-employee.js';

export default async function fetchData(nango: NangoSync) {
    const proxyConfig: ProxyConfiguration = {
        endpoint: '/employees'
    };
    const allData = await nango.get(proxyConfig);
    return toEmployee(allData);
}
```

- Avoid type casting to leverage TypeScript benefits:

```typescript
// ❌ Don't use type casting
return {
    user: userResult.records[0] as HumanUser,
    userType: 'humanUser'
};

// ✅ Do use proper type checks
if (isHumanUser(userResult.records[0])) {
    return {
        user: userResult.records[0],
        userType: 'humanUser'
    };
}
```

- For incremental syncs, use `nango.lastSyncDate`

## Actions

- `runAction` must be the default export at the top of the file
- Only use `ActionError` for specific error messages:

```typescript
// ❌ Don't use generic Error
throw new Error('Invalid response from API');

// ✅ Do use nango.ActionError with a message
throw new nango.ActionError({
    message: 'Invalid response format from API'
});
```

- Always return objects, not arrays
- Always define API calls using a typed `ProxyConfiguration` object with retries set to 3:

```typescript
// ❌ Don't make API calls without a ProxyConfiguration
const { data } = await nango.get({
    endpoint: '/some-endpoint',
    params: { key: 'value' }
});

// ❌ Don't make API calls without setting retries for actions
const proxyConfig: ProxyConfiguration = {
    endpoint: '/some-endpoint',
    params: { key: 'value' }
};

// ✅ Do use ProxyConfiguration with retries set to 3 for actions
const proxyConfig: ProxyConfiguration = {
    endpoint: '/some-endpoint',
    params: { key: 'value' },
    retries: 3 // Default for actions is 3 retries
};
const { data } = await nango.get(proxyConfig);
```

```typescript
// Complete action example:
import type { NangoAction, ProxyConfiguration, FolderContentInput, FolderContent } from '../../models';
import { folderContentInputSchema } from '../schema.zod.js';

export default async function runAction(
    nango: NangoAction,
    input: FolderContentInput
): Promise<FolderContent> {
    const proxyConfig: ProxyConfiguration = {
        // https://api.example.com/docs/endpoint
        endpoint: '/some-endpoint',
        params: { key: 'value' },
        retries: 3 // Default for actions is 3 retries
    };
    
    const { data } = await nango.get(proxyConfig);
    return { result: data };
}
```

## Testing

In order to test you need a valid connectionId. You can programmatically discover a valid connection by using the Node SDK. Here's a complete example of finding Salesforce connections:

1. First, create a script (e.g., `find-connections.js`):

```typescript
import { Nango } from '@nangohq/node';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

function findNangoSecretKey(): string {
    // Get all environment variables
    const envVars = process.env;
    
    // Find all NANGO_SECRET_KEY variables
    const nangoKeys = Object.entries(envVars)
        .filter(([key]) => key.startsWith('NANGO_SECRET_KEY'))
        .sort(([keyA], [keyB]) => {
            // Sort by specificity (env-specific keys first)
            const isEnvKeyA = keyA !== 'NANGO_SECRET_KEY';
            const isEnvKeyB = keyB !== 'NANGO_SECRET_KEY';
            if (isEnvKeyA && !isEnvKeyB) return -1;
            if (!isEnvKeyA && isEnvKeyB) return 1;
            return keyA.localeCompare(keyB);
        });

    if (nangoKeys.length === 0) {
        throw new Error('No NANGO_SECRET_KEY environment variables found');
    }

    // Use the first key after sorting
    const [key, value] = nangoKeys[0];
    console.log(`Using secret key: ${key}`);
    return value;
}

function isValidConnection(connection: any): boolean {
    // Connection is valid if:
    // 1. No errors array exists, or
    // 2. Errors array is empty, or
    // 3. No errors with type "auth" exist
    if (!connection.errors) return true;
    if (connection.errors.length === 0) return true;
    return !connection.errors.some(error => error.type === 'auth');
}

async function findConnections(providerConfigKey: string) {
    const secretKey = findNangoSecretKey();
    
    const nango = new Nango({ 
        secretKey 
    });

    // List all connections
    const { connections } = await nango.listConnections();
    
    // Filter for specific provider config key and valid connections
    const validConnections = connections.filter(conn => 
        conn.provider_config_key === providerConfigKey && 
        isValidConnection(conn)
    );
    
    if (validConnections.length === 0) {
        console.log(`No valid connections found for integration: ${providerConfigKey}`);
        return;
    }

    console.log(`Found ${validConnections.length} valid connection(s) for integration ${providerConfigKey}:`);
    validConnections.forEach(conn => {
        console.log(`- Connection ID: ${conn.connection_id}`);
        console.log(`  Provider: ${conn.provider}`);
        console.log(`  Created: ${conn.created}`);
        if (conn.errors?.length > 0) {
            console.log(`  Non-auth Errors: ${conn.errors.length}`);
        }
        console.log('---');
    });
}

// Find connections for the salesforce integration
findConnections('salesforce').catch(console.error);
```

2. Make sure your `.env` file contains at least one secret key:
```env
# Environment-specific keys take precedence
NANGO_SECRET_KEY_DEV=your_dev_secret_key_here
NANGO_SECRET_KEY_STAGING=your_staging_secret_key_here
# Fallback key
NANGO_SECRET_KEY=your_default_secret_key_here
```

3. Run the script:
```bash
node find-connections.js
```

Example output for the salesforce integration:
```
Using secret key: NANGO_SECRET_KEY_DEV
Found 1 valid connection(s) for integration salesforce:
- Connection ID: 3374a138-a81c-4ff9-b2ed-466c86b3554d
  Provider: salesforce
  Created: 2025-02-18T08:41:24.156+00:00
  Non-auth Errors: 1
---
```

Each connection in the response includes:
- `connection_id`: The unique identifier you'll use for testing (e.g., "3374a138-a81c-4ff9-b2ed-466c86b3554d")
- `provider`: The API provider (e.g., 'salesforce')
- `provider_config_key`: The integration ID you searched for (e.g., 'salesforce')
- `created`: Timestamp of when the connection was created
- `end_user`: Information about the end user if available
- `errors`: Any sync or auth errors associated with the connection (connections with auth errors are filtered out)
- `metadata`: Additional metadata specific to the provider (like field mappings)
