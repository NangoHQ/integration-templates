import { z } from 'zod';
import { createAction } from 'nango';

const PaRegistrationSchema = z.object({
    id: z.number(),
    siret: z.string().nullable(),
    siren: z.string(),
    status: z.enum(['pending', 'activated', 'provisioned', 'draft', 'archived']),
    exchange_direction: z.enum(['emission', 'reception', 'emission_and_reception']),
    created_at: z.string(),
    updated_at: z.string()
});

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Maximum number of items to return per page.')
});

const OutputSchema = z.object({
    items: z.array(PaRegistrationSchema),
    next_cursor: z.string().optional(),
    has_more: z.boolean()
});

const action = createAction({
    description: 'List PA registrations for the company.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pa_registrations:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/getparegistrations
            endpoint: '/api/external/v2/pa_registrations',
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                items: z.array(z.unknown()).default([]),
                next_cursor: z.string().nullable().optional(),
                has_more: z.boolean()
            })
            .parse(response.data);

        const items = providerResponse.items.map((item) => PaRegistrationSchema.parse(item));

        return {
            items,
            ...(providerResponse.next_cursor != null && { next_cursor: providerResponse.next_cursor }),
            has_more: providerResponse.has_more
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
