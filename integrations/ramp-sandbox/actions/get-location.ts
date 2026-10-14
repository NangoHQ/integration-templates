import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        location_id: z.string().describe('Unique identifier of the location to retrieve. Example: "09af6124-80ac-4d46-a5b2-7517f56e6cdf"')
    })
    .describe('Input for retrieving a single location by ID.');

const ProviderLocationSchema = z.object({
    id: z.string(),
    name: z.string(),
    entity_id: z.string()
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier for the location.'),
        name: z.string().describe('Name of the location. Example: "New York City, NY"'),
        entity_id: z.string().describe('Identifier of the business entity this location belongs to.')
    })
    .describe('A single location belonging to a Ramp business entity.');

/**
 * @tags: [read]
 * @tagReason: Retrieves an existing location by ID without modifying any provider state.
 */
const action = createAction({
    description: 'Retrieve a single location by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.ramp.com/openapi/developer-api.json (GET /developer/v1/locations/{location_id})
            endpoint: `/developer/v1/locations/${encodeURIComponent(input.location_id)}`,
            retries: 3
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
