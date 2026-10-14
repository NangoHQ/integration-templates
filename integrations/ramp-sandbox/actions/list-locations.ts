import { z } from 'zod';
import { createAction } from 'nango';

const LocationSchema = z.object({
    id: z.string().describe('Unique identifier for the location. Example: "84020a8c-695c-4b61-a1ee-cdcf31efbea6"'),
    name: z.string().describe('Name of the location. Example: "Seattle"'),
    entity_id: z.string().describe('Identifier of the business entity this location belongs to.')
});

const InputSchema = z
    .object({
        cursor: z
            .string()
            .min(1)
            .optional()
            .describe('Opaque pagination cursor returned as next_cursor by a previous call. Omit to fetch the first page.'),
        page_size: z.number().int().min(2).max(100).optional().describe('Number of locations to return per page (between 2 and 100). Defaults to 20.'),
        entity_id: z.string().optional().describe('Filter locations by the associated business entity ID. Example: "a7587328-64fa-4b8b-ad30-a2d27806825b"')
    })
    .describe('Filters and pagination options for listing office/work locations.');

const OutputSchema = z
    .object({
        locations: z.array(LocationSchema).describe('Locations returned on this page.'),
        next_cursor: z.string().optional().describe('Cursor to pass as `cursor` to fetch the next page. Absent when there are no more results.')
    })
    .describe('A page of office/work locations and the cursor for the following page.');

const ProviderLocationSchema = z.object({
    id: z.string(),
    name: z.string(),
    entity_id: z.string()
});

const ProviderPageSchema = z.object({
    data: z.array(ProviderLocationSchema),
    page: z.object({
        next: z.string().nullable()
    })
});

/**
 * @tags: [read]
 * @tagReason: Lists locations via a read-only provider GET and does not mutate any provider data.
 * @pitfalls: page_size accepts only 2-100 and defaults to 20, so a single-result page is rejected.
 */
const action = createAction({
    description: 'List office/work locations.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['locations:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.ramp.com/llms-api.txt (List locations: GET /developer/v1/locations)
            endpoint: '/developer/v1/locations',
            params: {
                ...(input.cursor !== undefined && { start: input.cursor }),
                ...(input.page_size !== undefined && { page_size: input.page_size }),
                ...(input.entity_id !== undefined && { entity_id: input.entity_id })
            },
            retries: 3
        });

        const page = ProviderPageSchema.parse(response.data);

        let nextCursor: string | undefined;
        if (page.page.next != null) {
            const start = new URL(page.page.next).searchParams.get('start');
            if (start === null || start === '') {
                throw new nango.ActionError({
                    type: 'invalid_pagination',
                    message: 'Could not determine the next page cursor from the provider response.'
                });
            }
            nextCursor = start;
        }

        return {
            locations: page.data.map((location) => ({
                id: location.id,
                name: location.name,
                entity_id: location.entity_id
            })),
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
