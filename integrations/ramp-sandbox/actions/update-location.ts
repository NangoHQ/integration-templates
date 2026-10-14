import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        location_id: z.string().describe('Unique identifier of the location to update. Example: "f4efe11c-221f-4b49-a1e4-33eaf96a49ee"'),
        name: z
            .string()
            .describe(
                'New name for the location. Required by the provider on every update, including when only changing the entity. Example: "New York City, NY"'
            ),
        entity_id: z
            .string()
            .optional()
            .describe(
                'Identifier of the business entity to reassign the location to. Existing users assigned to the location are moved to the new entity too. Omit to keep the current entity.'
            )
    })
    .describe('Input for updating an existing Ramp location.');

const ProviderLocationSchema = z.object({
    id: z.string(),
    name: z.string(),
    entity_id: z.string()
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the location.'),
        name: z.string().describe('Current name of the location.'),
        entity_id: z.string().describe('Identifier of the business entity the location now belongs to.')
    })
    .describe('The updated Ramp location.');

/**
 * @tags: [write]
 * @tagReason: Updates an existing location's name and optionally its owning entity via PATCH.
 * @pitfalls: A name must be sent with every update, so a location's entity cannot be reassigned on its own; reassigning the entity also moves every user currently assigned to that location.
 */
const action = createAction({
    description: 'Rename a location or reassign it to a different entity.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['locations:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.ramp.com/developer-api/v1/api/locations
        const response = await nango.patch({
            endpoint: `/developer/v1/locations/${encodeURIComponent(input.location_id)}`,
            data: {
                name: input.name,
                ...(input.entity_id !== undefined && { entity_id: input.entity_id })
            },
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
