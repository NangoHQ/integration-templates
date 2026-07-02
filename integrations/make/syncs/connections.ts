import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    team_id: z.string()
});

const ProviderConnectionSchema = z.object({
    id: z.number(),
    name: z.string(),
    accountName: z.string().nullable().optional(),
    accountLabel: z.string().nullable().optional(),
    packageName: z.string().nullable().optional(),
    expire: z.string().nullable().optional(),
    metadata: z
        .object({
            value: z.string().nullable().optional(),
            type: z.enum(['string', 'email']).nullable().optional()
        })
        .nullable()
        .optional(),
    teamId: z.number().optional(),
    theme: z.string().nullable().optional(),
    upgradeable: z.boolean().optional(),
    scopesCnt: z.number().optional(),
    scoped: z.boolean().optional(),
    accountType: z.string().nullable().optional(),
    editable: z.boolean().optional(),
    uid: z.string().nullable().optional(),
    connectedSystemId: z.string().nullable().optional(),
    organizationId: z.number().optional()
});

const ProviderResponseSchema = z.object({
    connections: z.array(ProviderConnectionSchema)
});

const ConnectionSchema = z.object({
    id: z.string(),
    name: z.string(),
    accountName: z.string().optional(),
    accountLabel: z.string().optional(),
    packageName: z.string().optional(),
    expire: z.string().optional(),
    metadataValue: z.string().optional(),
    metadataType: z.string().optional(),
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

const sync = createSync({
    description: 'Sync connections for a team.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    models: {
        Connection: ConnectionSchema
    },

    exec: async (nango) => {
        const rawMetadata = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(rawMetadata);
        if (!metadataResult.success) {
            throw new Error(`Invalid metadata: ${metadataResult.error.message}`);
        }

        const metadata = metadataResult.data;
        if (!metadata.team_id) {
            throw new Error('team_id is required in metadata');
        }

        const teamId = parseInt(metadata.team_id, 10);
        if (Number.isNaN(teamId)) {
            throw new Error('team_id must be a valid integer');
        }

        await nango.trackDeletesStart('Connection');

        // https://developers.make.com/api-documentation/
        const response = await nango.get({
            endpoint: '/connections',
            params: {
                teamId: String(teamId)
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Failed to parse connections response: ${parsed.error.message}`);
        }

        const connections = parsed.data.connections.map((connection) => ({
            id: String(connection.id),
            name: connection.name,
            ...(connection.accountName !== undefined && connection.accountName !== null && { accountName: connection.accountName }),
            ...(connection.accountLabel !== undefined && connection.accountLabel !== null && { accountLabel: connection.accountLabel }),
            ...(connection.packageName !== undefined && connection.packageName !== null && { packageName: connection.packageName }),
            ...(connection.expire !== undefined && connection.expire !== null && { expire: connection.expire }),
            ...(connection.metadata?.value !== undefined && connection.metadata.value !== null && { metadataValue: connection.metadata.value }),
            ...(connection.metadata?.type !== undefined && connection.metadata.type !== null && { metadataType: connection.metadata.type }),
            ...(connection.teamId !== undefined && { teamId: connection.teamId }),
            ...(connection.theme !== undefined && connection.theme !== null && { theme: connection.theme }),
            ...(connection.upgradeable !== undefined && { upgradeable: connection.upgradeable }),
            ...(connection.scopesCnt !== undefined && { scopesCnt: connection.scopesCnt }),
            ...(connection.scoped !== undefined && { scoped: connection.scoped }),
            ...(connection.accountType !== undefined && connection.accountType !== null && { accountType: connection.accountType }),
            ...(connection.editable !== undefined && { editable: connection.editable }),
            ...(connection.uid !== undefined && connection.uid !== null && { uid: connection.uid }),
            ...(connection.connectedSystemId !== undefined && connection.connectedSystemId !== null && { connectedSystemId: connection.connectedSystemId }),
            ...(connection.organizationId !== undefined && { organizationId: connection.organizationId })
        }));

        if (connections.length > 0) {
            await nango.batchSave(connections, 'Connection');
        }

        await nango.trackDeletesEnd('Connection');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
