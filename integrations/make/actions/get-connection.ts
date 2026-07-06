import { createAction } from 'nango';
import { z } from 'zod';

const InputSchema = z.object({
    connectionId: z.number()
});

const ScopeSchema = z.object({
    id: z.string(),
    name: z.string(),
    account: z.string()
});

const ConnectionSchema = z
    .object({
        id: z.number(),
        name: z.string(),
        accountName: z.string().nullish(),
        accountLabel: z.string().nullish(),
        packageName: z.string().nullish(),
        expire: z.string().nullish(),
        metadata: z
            .object({
                value: z.string().nullish(),
                type: z.enum(['string', 'email']).nullish()
            })
            .nullish(),
        teamId: z.number().nullish(),
        theme: z.string().nullish(),
        upgradeable: z.boolean().nullish(),
        scopesCnt: z.number().nullish(),
        scoped: z.boolean().nullish(),
        accountType: z.string().nullish(),
        editable: z.boolean().nullish(),
        uid: z.string().nullish(),
        connectedSystemId: z.string().nullish(),
        organizationId: z.number().nullish(),
        scopes: z.array(ScopeSchema).nullish()
    })
    .passthrough();

const OutputSchema = z.object({
    connection: ConnectionSchema
});

const action = createAction({
    description: 'Retrieve details of a single connection',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['connections:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const nangoConnection = await nango.getConnection();
        const environmentUrl = nangoConnection.connection_config?.['environmentUrl'];
        if (typeof environmentUrl !== 'string' || environmentUrl.length === 0) {
            throw new nango.ActionError({ message: 'Missing environmentUrl in connection config' });
        }

        // https://developers.make.com/api-documentation/api-reference/connections.md
        const response = await nango.get({
            baseUrlOverride: `https://${environmentUrl}/api/v2`,
            endpoint: `/connections/${encodeURIComponent(String(input.connectionId))}`,
            retries: 3
        });

        const parsed = OutputSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({ message: `Invalid response from Make API: ${parsed.error.message}` });
        }

        return parsed.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
