import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        name: z.string().describe('Name of the location to create. Example: "New York City, NY"'),
        entity_id: z.string().optional().describe('UUID of the business entity the location belongs to. Omit to associate it with the default business entity.')
    })
    .describe('Input for creating a new Ramp location.');

const ProviderLocationSchema = z.object({
    id: z.string(),
    name: z.string(),
    entity_id: z.string()
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the created location (UUID).'),
        name: z.string().describe('Name of the created location.'),
        entity_id: z.string().describe('UUID of the business entity the location belongs to.')
    })
    .describe('The newly created Ramp location.');

/**
 * @tags: [write]
 * @tagReason: Creates a new location record in the Ramp account through the provider's create endpoint.
 * @pitfalls: A created location cannot be deleted or archived through the Ramp API, so it remains permanently in the account.
 */
const action = createAction({
    description: 'Create a new location.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['locations:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.ramp.com/developer-api/v1/overview/introduction (POST /developer/v1/locations)
        const response = await nango.post({
            endpoint: '/developer/v1/locations',
            data: {
                name: input.name,
                ...(input.entity_id !== undefined && { entity_id: input.entity_id })
            },
            // Creating a location is not idempotent (no idempotency key): a retry after a lost response could create a duplicate.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const location = ProviderLocationSchema.parse(response.data);

        return {
            id: location.id,
            name: location.name,
            entity_id: location.entity_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
