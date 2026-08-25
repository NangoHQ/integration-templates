import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const AgentSchema = z.object({
    id: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    emailId: z.string().optional(),
    roleId: z.string().optional(),
    profileId: z.string().optional(),
    status: z.string().optional(),
    isActive: z.boolean().optional(),
    isConfirmed: z.boolean().optional(),
    photoURL: z.string().optional(),
    zuid: z.string().optional(),
    createdTime: z.string().optional(),
    modifiedTime: z.string().optional()
});

const CheckpointSchema = z.object({
    from: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync agents.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Agent: AgentSchema
    },
    endpoints: [
        {
            path: '/syncs/agents',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        // Blocker: Zoho Desk /api/v1/agents does not expose an updated/modified
        // timestamp filter or a changed-records endpoint. Agents are a small/static
        // resource, so we perform a full snapshot with offset pagination and
        // full-refresh delete tracking.
        const checkpoint = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint);
        const startFrom = parsedCheckpoint.success ? parsedCheckpoint.data.from : 1;
        let nextFrom: number | undefined;

        await nango.trackDeletesStart('Agent');

        const proxyConfig: ProxyConfiguration = {
            // https://desk.zoho.com/DeskAPIDocument
            endpoint: '/v1/agents',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'from',
                offset_start_value: startFrom ?? 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'limit',
                limit: 50,
                response_path: 'data',
                on_page: async ({ nextPageParam }) => {
                    nextFrom = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const parsed = z.array(AgentSchema).safeParse(page);
            if (!parsed.success) {
                throw new Error(`Failed to parse agents page: ${parsed.error.message}`);
            }

            const records = parsed.data.map((agent) => ({
                id: agent.id,
                ...(agent.firstName !== undefined && { firstName: agent.firstName }),
                ...(agent.lastName !== undefined && { lastName: agent.lastName }),
                ...(agent.emailId !== undefined && { emailId: agent.emailId }),
                ...(agent.roleId !== undefined && { roleId: agent.roleId }),
                ...(agent.profileId !== undefined && { profileId: agent.profileId }),
                ...(agent.status !== undefined && { status: agent.status }),
                ...(agent.isActive !== undefined && { isActive: agent.isActive }),
                ...(agent.isConfirmed !== undefined && { isConfirmed: agent.isConfirmed }),
                ...(agent.photoURL !== undefined && { photoURL: agent.photoURL }),
                ...(agent.zuid !== undefined && { zuid: agent.zuid }),
                ...(agent.createdTime !== undefined && { createdTime: agent.createdTime }),
                ...(agent.modifiedTime !== undefined && { modifiedTime: agent.modifiedTime })
            }));

            if (records.length > 0) {
                await nango.batchSave(records, 'Agent');
            }

            if (nextFrom !== undefined) {
                await nango.saveCheckpoint({ from: nextFrom });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Agent');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
