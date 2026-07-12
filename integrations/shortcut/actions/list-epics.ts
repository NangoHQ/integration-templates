import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    query: z.string().optional().describe('Shortcut search query using search-operator syntax. When provided, the paginated /search/epics endpoint is used.'),
    cursor: z.string().optional().describe('Pagination cursor from a previous search response. Only used when query is also provided.')
});

const EpicSchema = z
    .object({
        id: z.number().describe('Epic ID. Example: 16'),
        name: z.string().optional(),
        description: z.string().nullable().optional(),
        epic_state_id: z.number().optional(),
        milestone_id: z.number().nullable().optional(),
        archived: z.boolean().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(EpicSchema),
    next: z
        .string()
        .optional()
        .describe('Pagination cursor when using the search endpoint. Omitted when listing all epics or when there are no more search results.')
});

const action = createAction({
    description: 'List epics.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.query) {
            // https://developer.shortcut.com/api/rest/v3#Search-Epics
            const response = await nango.get({
                endpoint: '/api/v3/search/epics',
                params: {
                    query: input.query,
                    ...(input.cursor && { next: input.cursor })
                },
                retries: 3
            });

            const searchResult = z
                .object({
                    data: z.array(z.unknown()),
                    next: z.string().optional(),
                    total: z.number().optional()
                })
                .parse(response.data);

            return {
                items: searchResult.data.map((item) => EpicSchema.parse(item)),
                ...(searchResult.next != null && { next: searchResult.next })
            };
        }

        // https://developer.shortcut.com/api/rest/v3#List-Epics
        const response = await nango.get({
            endpoint: '/api/v3/epics',
            retries: 3
        });

        const epics = z.array(z.unknown()).parse(response.data);

        return {
            items: epics.map((epic) => EpicSchema.parse(epic))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
