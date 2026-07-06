import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    connectionId: z.number().describe('The ID of the connection to rename. Example: 8708889'),
    name: z.string().max(128).describe('The new display name for the connection.')
});

const ConnectionSchema = z.object({
    id: z.number(),
    name: z.string(),
    accountName: z.string().nullable().optional(),
    accountLabel: z.string().nullable().optional(),
    packageName: z.string().nullable().optional(),
    expire: z.string().nullable().optional(),
    metadata: z.object({ value: z.string().optional(), type: z.string().optional() }).nullable().optional(),
    teamId: z.number().nullable().optional(),
    theme: z.string().nullable().optional(),
    upgradeable: z.boolean().nullable().optional(),
    scopesCnt: z.number().nullable().optional(),
    scoped: z.boolean().nullable().optional(),
    accountType: z.string().nullable().optional(),
    editable: z.boolean().nullable().optional(),
    uid: z.string().nullable().optional(),
    connectedSystemId: z.string().nullable().optional(),
    organizationId: z.number().nullable().optional()
});

const OutputSchema = ConnectionSchema;

const action = createAction({
    description: 'Rename a connection.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['connections:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.make.com/api-documentation/api-reference/connections
        const response = await nango.patch({
            endpoint: `/connections/${encodeURIComponent(input.connectionId)}`,
            data: {
                name: input.name
            },
            retries: 3
        });

        const providerConnection = ConnectionSchema.parse(response.data.connection);

        return providerConnection;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
