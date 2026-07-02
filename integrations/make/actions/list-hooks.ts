import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    teamId: z.string().describe('The unique ID of the team whose hooks will be retrieved. Example: "2066772"'),
    typeName: z.string().optional().describe('The hook type. Two native Make hook types are gateway-webhook and gateway-mailhook.'),
    assigned: z.boolean().optional().describe('If true, return only hooks assigned to a scenario.'),
    viewForScenarioId: z.number().optional().describe('Show only hooks that can be used by a scenario with this specific ID.'),
    cursor: z.string().optional().describe('Pagination cursor (offset). Omit for the first page.')
});

const HookSchema = z.object({
    id: z.number(),
    name: z.string(),
    teamId: z.number().optional(),
    udid: z.string().optional(),
    type: z.string().optional(),
    packageName: z.string().nullable().optional(),
    theme: z.string().nullable().optional(),
    flags: z
        .object({
            form: z.boolean().optional()
        })
        .optional(),
    editable: z.boolean().optional(),
    queueCount: z.number().optional(),
    queueLimit: z.number().optional(),
    enabled: z.boolean().optional(),
    gone: z.boolean().optional(),
    typeName: z.string().optional(),
    data: z
        .object({
            headers: z.boolean().optional(),
            method: z.boolean().optional(),
            stringify: z.boolean().optional(),
            teamId: z.number().optional(),
            ip: z.string().optional(),
            udt: z.number().optional()
        })
        .passthrough()
        .optional(),
    scenarioId: z.number().nullable().optional(),
    url: z.string().optional()
});

const PgSchema = z
    .object({
        sortBy: z.string().optional(),
        sortDir: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    hooks: z.array(HookSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List webhooks/mailhooks for a team.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['hooks:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const offset = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (isNaN(offset)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a valid integer offset string'
            });
        }

        const params: Record<string, string | number> = {
            teamId: input.teamId,
            'pg[offset]': offset,
            'pg[limit]': 100
        };

        if (input.typeName !== undefined) {
            params['typeName'] = input.typeName;
        }
        if (input.assigned !== undefined) {
            params['assigned'] = input.assigned ? 'true' : 'false';
        }
        if (input.viewForScenarioId !== undefined) {
            params['viewForScenarioId'] = input.viewForScenarioId;
        }

        const response = await nango.get({
            // https://developers.make.com/api-documentation/hooks/list-hooks
            endpoint: '/hooks',
            params,
            retries: 3
        });

        const providerResponse = z
            .object({
                hooks: z.array(HookSchema),
                pg: PgSchema.optional()
            })
            .parse(response.data);

        const hooks = providerResponse.hooks;
        const pg = providerResponse.pg;

        let nextCursor: string | undefined;
        if (pg && pg.limit !== undefined && pg.offset !== undefined && hooks.length === pg.limit) {
            nextCursor = String(pg.offset + pg.limit);
        }

        return {
            hooks,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
