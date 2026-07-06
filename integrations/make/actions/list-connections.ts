import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    teamId: z.number().describe('The unique ID of the team whose connections will be retrieved. Example: 2066772')
});

const ProviderMetadataSchema = z.object({
    value: z.string().nullable().optional(),
    type: z.string().nullable().optional()
});

const ProviderConnectionSchema = z.object({
    id: z.number(),
    name: z.string().nullable().optional(),
    accountName: z.string().nullable().optional(),
    accountLabel: z.string().nullable().optional(),
    packageName: z.string().nullable().optional(),
    expire: z.string().nullable().optional(),
    metadata: ProviderMetadataSchema.nullable().optional(),
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

const ProviderResponseSchema = z.object({
    connections: z.array(ProviderConnectionSchema)
});

const ConnectionSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    accountName: z.string().optional(),
    accountLabel: z.string().optional(),
    packageName: z.string().optional(),
    expire: z.string().optional(),
    metadata: z.object({ value: z.string().optional(), type: z.string().optional() }).optional(),
    teamId: z.number().optional(),
    theme: z.string().optional(),
    upgradeable: z.boolean().optional(),
    scopesCnt: z.number().optional(),
    scoped: z.boolean().optional(),
    accountType: z.string().optional(),
    editable: z.boolean().optional(),
    uid: z.string().optional(),
    connectedSystemId: z.string().optional(),
    organizationId: z.number().optional()
});

const OutputSchema = z.object({
    connections: z.array(ConnectionSchema)
});

function omitNull<T>(value: T | null | undefined): T | undefined {
    return value === null ? undefined : value;
}

function omitNullMetadata(
    value: { value?: string | null | undefined; type?: string | null | undefined } | null | undefined
): { value: string | undefined; type: string | undefined } | undefined {
    if (value === null || value === undefined) {
        return undefined;
    }

    const result = {
        value: omitNull(value.value),
        type: omitNull(value.type)
    };

    if (result.value === undefined && result.type === undefined) {
        return undefined;
    }

    return result;
}

const action = createAction({
    description: 'List connections for a team.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['connections:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.make.com/api-documentation/api-reference/connections
            endpoint: '/connections',
            params: {
                teamId: input.teamId
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const connections = providerResponse.connections.map((connection) => {
            return {
                id: connection.id,
                name: omitNull(connection.name),
                accountName: omitNull(connection.accountName),
                accountLabel: omitNull(connection.accountLabel),
                packageName: omitNull(connection.packageName),
                expire: omitNull(connection.expire),
                metadata: omitNullMetadata(connection.metadata),
                teamId: omitNull(connection.teamId),
                theme: omitNull(connection.theme),
                upgradeable: omitNull(connection.upgradeable),
                scopesCnt: omitNull(connection.scopesCnt),
                scoped: omitNull(connection.scoped),
                accountType: omitNull(connection.accountType),
                editable: omitNull(connection.editable),
                uid: omitNull(connection.uid),
                connectedSystemId: omitNull(connection.connectedSystemId),
                organizationId: omitNull(connection.organizationId)
            };
        });

        return {
            connections
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
