import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.string().optional().describe('Filter sections by project ID. Example: "6h78PW84RjxxRW8q"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(200).optional().describe('Maximum number of items to return per page. Example: 50')
});

const SectionSchema = z.object({
    id: z.string(),
    name: z.string(),
    project_id: z.string(),
    section_order: z.number().int().optional()
});

const ProviderResponseSchema = z.object({
    results: z.array(z.unknown()),
    next_cursor: z.string().nullable().optional()
});

const OutputSchema = z.object({
    results: z.array(
        z.object({
            id: z.string(),
            name: z.string(),
            project_id: z.string(),
            section_order: z.number().int().optional()
        })
    ),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List sections, optionally scoped to a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.todoist.com/api/v1/#get-all-sections
            endpoint: '/api/v1/sections',
            params: {
                ...(input.project_id !== undefined && { project_id: input.project_id }),
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        });

        const raw = ProviderResponseSchema.parse(response.data);
        const results = raw.results.map((item) => SectionSchema.parse(item));
        const nextCursor = raw.next_cursor;

        return {
            results,
            ...(nextCursor != null && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
