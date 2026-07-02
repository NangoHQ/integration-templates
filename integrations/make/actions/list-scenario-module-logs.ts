import { z } from 'zod';
import { createAction } from 'nango';

const WarningSchema = z
    .object({
        message: z.string().optional()
    })
    .optional();

const ErrorSchema = z
    .object({
        message: z.string().optional()
    })
    .optional();

const ModuleLogSchema = z
    .object({
        imtId: z.string().optional(),
        executionId: z.string().optional(),
        organizationId: z.number().optional(),
        teamId: z.number().optional(),
        scenarioId: z.number().optional(),
        timestamp: z.string().optional(),
        status: z.number().optional(),
        bundles: z.number().optional(),
        size: z.number().optional(),
        warning: WarningSchema,
        error: ErrorSchema
    })
    .passthrough();

const PgSchema = z
    .object({
        last: z.string().optional(),
        showLast: z.boolean().optional(),
        sortBy: z.string().optional(),
        sortDir: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional()
    })
    .passthrough();

const InputSchema = z.object({
    scenarioId: z.number().int().positive().describe('The ID of the scenario. Example: 6413021'),
    moduleId: z.number().int().positive().describe('The unique ID of the scenario module (flow node id from the blueprint). Example: 1'),
    cursor: z.string().optional().describe('Pagination cursor (offset) from the previous response. Omit for the first page.'),
    limit: z.number().int().positive().optional().describe('The maximum number of entities to return.')
});

const OutputSchema = z
    .object({
        moduleLogs: z.array(ModuleLogSchema),
        pg: PgSchema,
        nextCursor: z.string().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    moduleLogs: z.array(ModuleLogSchema).optional(),
    pg: PgSchema.optional()
});

const action = createAction({
    description: 'List operation logs for a single module within a scenario.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['scenarios:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input.cursor !== undefined) {
            const offset = Number(input.cursor);
            if (!Number.isInteger(offset) || offset < 0) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor must be a valid non-negative integer offset string'
                });
            }
            params['pg[offset]'] = offset;
        }
        if (input.limit !== undefined) {
            params['pg[limit]'] = input.limit;
        }

        const response = await nango.get({
            // https://developers.make.com/api-documentation/
            endpoint: `/scenarios/${encodeURIComponent(String(input.scenarioId))}/modules/${encodeURIComponent(String(input.moduleId))}/logs`,
            params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const moduleLogs = providerResponse.moduleLogs ?? [];
        const pg = providerResponse.pg ?? {};

        let nextCursor: string | undefined;
        if (pg.last !== undefined) {
            nextCursor = pg.last;
        } else if (pg.offset !== undefined && moduleLogs.length > 0) {
            nextCursor = String(pg.offset + moduleLogs.length);
        }

        return {
            moduleLogs,
            pg,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
