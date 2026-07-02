import { z } from 'zod';
import { createAction } from 'nango';

const DeviceSchema = z.object({
    id: z.number(),
    scope: z.string()
});

const UserSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    email: z.string().optional()
});

const SchedulingSchema = z.object({
    type: z.string().optional(),
    interval: z.number().optional()
});

const ScenarioSchema = z
    .object({
        id: z.number(),
        name: z.string().nullable().optional(),
        teamId: z.number().nullable().optional(),
        hookId: z.number().nullable().optional(),
        devices: z.array(DeviceSchema).nullable().optional(),
        deviceId: z.number().nullable().optional(),
        deviceScope: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        folderId: z.number().nullable().optional(),
        isinvalid: z.boolean().nullable().optional(),
        islinked: z.boolean().nullable().optional(),
        isActive: z.boolean().nullable().optional(),
        islocked: z.boolean().nullable().optional(),
        isPaused: z.boolean().nullable().optional(),
        usedPackages: z.array(z.string()).nullable().optional(),
        lastEdit: z.string().nullable().optional(),
        scheduling: SchedulingSchema.nullable().optional(),
        iswaiting: z.boolean().nullable().optional(),
        dlqCount: z.number().nullable().optional(),
        createdByUser: UserSchema.nullable().optional(),
        updatedByUser: UserSchema.nullable().optional(),
        nextExec: z.string().nullable().optional(),
        created: z.string().nullable().optional(),
        scenarioVersion: z.number().nullable().optional(),
        moduleSequenceId: z.number().nullable().optional(),
        type: z.string().nullable().optional(),
        deleted: z.boolean().nullable().optional(),
        deletedAt: z.string().nullable().optional()
    })
    .passthrough();

const PgSchema = z.object({
    last: z.string().optional(),
    showLast: z.boolean().optional(),
    sortBy: z.string().optional(),
    sortDir: z.string().optional(),
    limit: z.number().optional(),
    offset: z.number().optional()
});

const InputSchema = z.object({
    teamId: z.number().optional().describe('The unique ID of the team whose scenarios will be retrieved. Either teamId or organizationId is required.'),
    organizationId: z
        .number()
        .optional()
        .describe('The unique ID of the organization whose scenarios will be retrieved. Either teamId or organizationId is required.'),
    folderId: z.number().optional().describe('The unique ID of the folder containing scenarios you want to retrieve.'),
    cols: z.array(z.string()).optional().describe('Specifies columns that are returned in the response.'),
    offset: z.number().optional().describe('Pagination offset.'),
    limit: z.number().optional().describe('Pagination limit.'),
    sortBy: z.string().optional().describe('The value that will be used to sort returned entities by.'),
    sortDir: z.string().optional().describe('The only allowed value for this parameter is desc.')
});

const OutputSchema = z.object({
    scenarios: z.array(ScenarioSchema),
    pg: PgSchema
});

const ProviderResponseSchema = z.object({
    scenarios: z.array(z.unknown()),
    pg: z.unknown()
});

const action = createAction({
    description: 'List scenarios for a team or organization.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['scenarios:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!input.teamId && !input.organizationId) {
            throw new nango.ActionError({
                type: 'missing_required_param',
                message: 'Either teamId or organizationId is required.'
            });
        }

        if (input.teamId && input.organizationId) {
            throw new nango.ActionError({
                type: 'invalid_params',
                message: 'teamId and organizationId cannot be used together.'
            });
        }

        const queryParts: string[] = [];

        if (input.teamId !== undefined) {
            queryParts.push(`teamId=${encodeURIComponent(String(input.teamId))}`);
        }

        if (input.organizationId !== undefined) {
            queryParts.push(`organizationId=${encodeURIComponent(String(input.organizationId))}`);
        }

        if (input.folderId !== undefined) {
            queryParts.push(`folderId=${encodeURIComponent(String(input.folderId))}`);
        }

        if (input.cols !== undefined && input.cols.length > 0) {
            for (const col of input.cols) {
                queryParts.push(`cols[]=${encodeURIComponent(col)}`);
            }
        }

        if (input.offset !== undefined) {
            queryParts.push(`pg[offset]=${encodeURIComponent(String(input.offset))}`);
        }

        if (input.limit !== undefined) {
            queryParts.push(`pg[limit]=${encodeURIComponent(String(input.limit))}`);
        }

        if (input.sortBy !== undefined) {
            queryParts.push(`pg[sortBy]=${encodeURIComponent(input.sortBy)}`);
        }

        if (input.sortDir !== undefined) {
            queryParts.push(`pg[sortDir]=${encodeURIComponent(input.sortDir)}`);
        }

        let endpoint = '/scenarios';
        if (queryParts.length > 0) {
            endpoint = `${endpoint}?${queryParts.join('&')}`;
        }

        const response = await nango.get({
            // https://developers.make.com/api-documentation/api-reference/scenarios.md
            endpoint,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const scenarios = parsed.scenarios.map((item) => ScenarioSchema.parse(item));
        const pgResult = PgSchema.parse(parsed.pg);

        return {
            scenarios,
            pg: pgResult
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
