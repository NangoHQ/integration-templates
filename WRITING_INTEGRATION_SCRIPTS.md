Writing Integration Scripts
==================
Best practices and guidelines

# Configuration - nango.yaml
* If `sync_type: full`, then the sync should also have `track_deletes: true`
* If the sync requires metadata, then the sync should be set to `auto_start: false`.
The metadata should be documented as an input in the nango.yaml.
* Scopes should be documented
```
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
models:
    ContactMetada:
    ...
```

# Scripts
* Use comments to explain the logic and link to external API documentation. Add comments with the endpoint URL above each API request.
* Avoid modifying arguments and prefer returning new values.
* Add a `types.ts`  file which contains typed third party API responses. This strictly types the third party response so that in the specific mappers file we can know the structure to map from to create our custom desired object
* Proxy calls should use retries, the default should be 10:
```
await nango.log({
    retries: 10,
    ...
})
```
* Use `await nango.log` to provide helpful logs and don't use `console.log`
* Proxy calls should use the `params` property instead of appending params onto the endpoint directly
* Use the built in `nango.paginate` wherever possible:
```

const proxyConfig: ProxyConfiguration = {
    endpoint,
    retries: 10,
    paginate: {
        response_path: 'comments'
    }
};
for await (const pages of nango.paginate(proxyConfig)) {
    ...
}
```
* Always use `ProxyConfiguration` when setting the configuration for a proxy request.

## Validation
* Validate script inputs and outputs using `zod`

## Syncs
* `fetchData` must be the default exported and should be at the top of the file
* Requests should always be paginated to ensure all records are retrieved.
* Avoid parallelizing requests because it can defeat the request retry policy
and doesn't help if we are rate limited.
* Mapping the data should take place in a dedicated function. If mapping logic
is shared then the map function should live in its own file in its own directory called `mappers`.
The name of the file should take the form `mappers/to-${entity}`, for example `mappers/to-employee.ts`
```
import { toEmployee } from '../mappers/to-employee.js'
export default async fetchData(nango: NangoSync) {
    const proxyConfig: ProxyConfiguration = {
        endpoint: '/employees'
    };
    const alldata = await nango.get(proxyConfig)

    const employees = toEmployee(allData);
}
```
* Avoid casting wherever possible to leverage the full benefits of Typescript
```
return {
    //avoid this and instead add checks in code to avoid casting
    user: userResult.records[0] as HumanUser,
    userType: 'humanUser'
};
```
* If the sync is incremental, ensure it uses `nango.lastSyncDate`

## Actions
* `runAction` must be the default exported and should be at the top of the file
* Only use `ActionError` if ouputting a specific error message, otherwise rely on the script failing.
```
throw new nango.ActionError<ActionErrorResponse>({
  message: 'Missing some parameter that will prevent the action from successfully running'
});
```
