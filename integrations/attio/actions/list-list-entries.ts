import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        list: z.string().describe('A UUID or slug to identify the list to retrieve entries from. Example: "33ebdbe9-e529-47c9-b894-0ba25e9c15c0"'),
        filter: z
            .record(z.string(), z.unknown())
            .optional()
            .describe('An object used to filter results to a subset of results. Cannot be used together with filter_view_id.'),
        filter_view_id: z
            .string()
            .optional()
            .describe(
                "UUID of a saved view on this list. When set, results are filtered using that view's filter configuration. Cannot be used together with filter."
            ),
        sorts: z
            .array(
                z.union([
                    z.object({
                        direction: z.enum(['asc', 'desc']),
                        attribute: z.string(),
                        field: z.string().optional()
                    }),
                    z.object({
                        direction: z.enum(['asc', 'desc']),
                        path: z.array(z.array(z.string())),
                        field: z.string().optional()
                    })
                ])
            )
            .optional(),
        limit: z.number().optional().describe('The maximum number of results to return. Defaults to 500.'),
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
    })
    .superRefine((data, ctx) => {
        if (data.filter !== undefined && data.filter_view_id !== undefined) {
            ctx.addIssue({
                code: 'custom',
                message: 'filter and filter_view_id are mutually exclusive and cannot both be provided.'
            });
        }
    });

const ProviderEntrySchema = z.object({
    id: z.object({
        workspace_id: z.string(),
        list_id: z.string(),
        entry_id: z.string()
    }),
    parent_record_id: z.string().optional(),
    parent_object: z.string().optional(),
    created_at: z.string().optional(),
    entry_values: z.record(z.string(), z.array(z.unknown())).optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderEntrySchema)
});

const OutputSchema = z.object({
    entries: z.array(
        z.object({
            id: z.object({
                workspace_id: z.string(),
                list_id: z.string(),
                entry_id: z.string()
            }),
            parent_record_id: z.string().optional(),
            parent_object: z.string().optional(),
            created_at: z.string().optional(),
            entry_values: z.record(z.string(), z.array(z.unknown())).optional()
        })
    ),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List list entries from Attio.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-list-entries',
        group: 'Lists'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['list_entry:read', 'list_configuration:read'],

    exec: async (nango, input) => {
        const offset = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (input.cursor && !/^\d+$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a valid integer string'
            });
        }

        const limit = input.limit ?? 500;

        const response = await nango.post({
            // https://docs.attio.com/rest-api/endpoint-reference/entries/list-entries
            endpoint: `/v2/lists/${input.list}/entries/query`,
            data: {
                ...(input.filter !== undefined && { filter: input.filter }),
                ...(input.filter_view_id !== undefined && { filter_view_id: input.filter_view_id }),
                ...(input.sorts !== undefined && { sorts: input.sorts }),
                limit,
                offset
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const entries = providerResponse.data;

        const nextCursor = entries.length === limit ? String(offset + limit) : undefined;

        return {
            entries: entries.map((entry) => ({
                id: entry.id,
                parent_record_id: entry.parent_record_id,
                parent_object: entry.parent_object,
                created_at: entry.created_at,
                entry_values: entry.entry_values
            })),
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
