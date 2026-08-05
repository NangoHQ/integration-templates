import { z } from 'zod';
import { createAction } from 'nango';

const ProviderDocumentTagSchema = z
    .object({
        id: z.number(),
        name: z.string()
    })
    .passthrough();

const PaginationSchema = z.object({
    page: z.number(),
    pages: z.number(),
    per_page: z.number(),
    total: z.number()
});

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.')
});

const OutputSchema = z.object({
    entries: z.array(ProviderDocumentTagSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List tags available for tagging documents/files.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.cursor !== undefined && !/^[1-9]\d*$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a positive integer page number'
            });
        }

        const params: Record<string, string> = {};
        if (input.cursor !== undefined) {
            params['page'] = input.cursor;
        }

        const response = await nango.get({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: 'api/v3/admin/document_tags',
            params,
            retries: 3
        });

        const parsed = z
            .object({
                entries: z.array(ProviderDocumentTagSchema).default([]),
                pagination: PaginationSchema
            })
            .parse(response.data);

        const nextCursor = parsed.pagination.page < parsed.pagination.pages ? String(parsed.pagination.page + 1) : undefined;

        return {
            entries: parsed.entries,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
