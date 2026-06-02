import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(100).optional().describe('Number of results per page. Defaults to the API limit.'),
    includeArchived: z.boolean().optional().describe('When true, includes archived items. Defaults to false.')
});

const SourceTypeSchema = z.object({
    id: z.string(),
    title: z.string(),
    isArchived: z.boolean().optional()
});

const SourceSchema = z.object({
    id: z.string(),
    title: z.string(),
    isArchived: z.boolean().optional(),
    sourceType: SourceTypeSchema.optional()
});

const OutputSchema = z.object({
    items: z.array(SourceSchema),
    next_cursor: z.string().optional(),
    sync_token: z.string().optional()
});

const ProviderResponseSchema = z.object({
    success: z.boolean(),
    results: z.array(z.unknown()),
    moreDataAvailable: z.boolean(),
    nextCursor: z.string().optional(),
    syncToken: z.string().optional()
});

const action = createAction({
    description: 'List sources from Ashby.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-sources',
        group: 'Sources'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['hiringProcessMetadataRead'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.ashbyhq.com/reference/sourcelist
            endpoint: 'source.list',
            data: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.includeArchived !== undefined && { includeArchived: input.includeArchived })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Ashby API returned success: false'
            });
        }

        const items = parsed.results.map((item) => {
            const source = SourceSchema.parse(item);
            return {
                id: source.id,
                title: source.title,
                ...(source.isArchived !== undefined && { isArchived: source.isArchived }),
                ...(source.sourceType !== undefined && { sourceType: source.sourceType })
            };
        });

        return {
            items,
            ...(parsed.nextCursor !== undefined && { next_cursor: parsed.nextCursor }),
            ...(parsed.syncToken !== undefined && { sync_token: parsed.syncToken })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
