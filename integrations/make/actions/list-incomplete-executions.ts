import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    scenarioId: z.number().describe('The ID of the scenario to list incomplete executions for. Example: 6413021'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Maximum number of results to return per page. Defaults to 25.')
});

const DlqSchema = z.object({
    id: z.string(),
    reason: z.string().nullable().optional(),
    created: z.string().nullable().optional(),
    size: z.number().nullable().optional(),
    resolved: z.boolean().nullable().optional(),
    retry: z.boolean().nullable().optional(),
    attempts: z.number().nullable().optional()
});

const PgSchema = z.object({
    sortBy: z.string().optional(),
    sortDir: z.string().optional(),
    limit: z.number().optional(),
    offset: z.number().optional()
});

const OutputSchema = z.object({
    items: z.array(DlqSchema),
    next_cursor: z.string().optional(),
    pg: PgSchema.optional()
});

const action = createAction({
    description: 'List incomplete/failed executions (DLQ) for a scenario.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['dlqs:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 25;
        const offset = input.cursor ? Number(input.cursor) : 0;

        if (Number.isNaN(offset)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Invalid pagination cursor. Must be a numeric offset.'
            });
        }

        // https://developers.make.com/api-documentation/
        const response = await nango.get({
            endpoint: '/dlqs',
            params: {
                scenarioId: input.scenarioId,
                'pg[offset]': offset,
                'pg[limit]': limit
            },
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            dlqs: z.array(z.unknown()).optional(),
            pg: PgSchema.optional()
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const rawPage = providerResponse.dlqs || [];
        const dlqs = rawPage.flatMap((item) => {
            const result = DlqSchema.safeParse(item);
            return result.success ? [result.data] : [];
        });

        const next_cursor = rawPage.length === limit ? String(offset + limit) : undefined;

        return {
            items: dlqs,
            next_cursor: next_cursor,
            pg: providerResponse.pg
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
