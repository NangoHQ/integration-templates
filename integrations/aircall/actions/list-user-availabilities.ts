import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.')
});

const ProviderAvailabilitySchema = z.object({
    id: z.number().describe('User ID. Example: 1981305'),
    availability: z.string().describe('Availability status. Example: available')
});

const ProviderResponseSchema = z.object({
    users: z.array(ProviderAvailabilitySchema),
    meta: z.object({
        count: z.number(),
        total: z.number(),
        current_page: z.number(),
        per_page: z.number(),
        next_page_link: z.string().nullable().optional(),
        previous_page_link: z.string().nullable().optional()
    })
});

const OutputSchema = z.object({
    items: z.array(
        z.object({
            id: z.number().describe('User ID. Example: 1981305'),
            availability: z.string().describe('Availability status. Values: available, unavailable, offline, custom')
        })
    ),
    next_cursor: z.string().optional().describe('Cursor for the next page. Omit if there are no more pages.')
});

const action = createAction({
    description: 'List availability status for all Aircall users.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['users:read'],

    endpoint: {
        method: 'GET',
        path: '/actions/list-user-availabilities'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (input.cursor && (isNaN(page) || page < 1 || !/^\d+$/.test(input.cursor))) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a positive integer page number'
            });
        }

        const response = await nango.get({
            // https://developer.aircall.io/api-references/
            endpoint: '/v1/users/availabilities',
            params: {
                page: String(page),
                per_page: '50'
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const nextCursor = providerResponse.meta.next_page_link != null ? String(providerResponse.meta.current_page + 1) : undefined;

        return {
            items: providerResponse.users.map((user) => ({
                id: user.id,
                availability: user.availability
            })),
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
