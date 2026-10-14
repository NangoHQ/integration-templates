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
            .describe('Pagination cursor from the previous response (the ID of the last location on that page). Omit to fetch the first page.'),
        page_size: z.number().int().min(2).max(100).optional().describe('Number of locations to return per page (between 2 and 100). Defaults to 20.'),
        entity_id: z.string().optional().describe('Filter locations by the associated business entity ID. Example: "a7587328-64fa-4b8b-ad30-a2d27806825b"')
    })
    .describe('Filters and pagination options for listing office/work locations.');

const OutputSchema = z
    .object({
        locations: z.array(LocationSchema).describe('Locations returned on this page.'),
        next_cursor: z.string().nullable().describe('Cursor to pass as `cursor` to fetch the next page, or null when there are no more results.')
    })
    .describe('A page of office/work locations and the cursor for the following page.');

const ProviderPageSchema = z.object({
    data: z.array(LocationSchema),
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

        let nextCursor: string | null = null;
        if (page.page.next != null) {
            nextCursor = new URL(page.page.next).searchParams.get('start');
            if (nextCursor === null) {
                throw new nango.ActionError({
                    type: 'invalid_pagination',
                    message: 'Could not determine the next page cursor from the provider response.'
                });
            }
        }

        return {
            locations: page.data,
            next_cursor: nextCursor
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
