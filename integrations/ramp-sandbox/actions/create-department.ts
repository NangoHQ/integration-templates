import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        name: z.string().describe('Name of the department to create. Example: "Engineering"')
    })
    .describe('Input for creating a new department.');

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the created department. Example: "c16b6ee1-2f5d-45e9-9fb4-c1c541a9ea70"'),
        name: z.string().describe('Name of the created department. Example: "Engineering"')
    })
    .describe('The newly created department.');

/**
 * @tags: [write]
 * @tagReason: Creates a new department through the provider's POST endpoint.
 * @pitfalls: Departments cannot be deleted or archived through the Ramp API, so a created department persists permanently; choose the name carefully before invoking.
 */
const action = createAction({
    description: 'Create a new department.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.ramp.com/openapi/developer-api.json (POST /developer/v1/departments)
        const response = await nango.post({
            endpoint: '/developer/v1/departments',
            data: {
                name: input.name
            },
            // Creating a department is not idempotent (no idempotency key), so a retry after a lost response would create a duplicate department.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const department = OutputSchema.parse(response.data);

        return department;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
