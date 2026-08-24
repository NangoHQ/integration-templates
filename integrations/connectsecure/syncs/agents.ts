import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderAgentSchema = z
    .object({
        id: z
            .union([z.string(), z.number()])
            .transform((value) => String(value))
            .describe('Agent identifier'),
        company_id: z.coerce.string().optional().nullable().describe('Company identifier'),
        host_name: z.string().optional().nullable().describe('Host name'),
        agent_type: z.string().optional().nullable().describe('Agent type, e.g. LIGHTWEIGHT'),
        agent_version: z.string().optional().nullable().describe('Agent version'),
        os_name: z.string().optional().nullable().describe('Operating system name'),
        os_platform: z.string().optional().nullable().describe('OS platform, e.g. darwin'),
        os_version: z.string().optional().nullable().describe('OS version'),
        status: z.string().optional().nullable().describe('Agent status'),
        created: z.string().optional().nullable().describe('Creation timestamp'),
        updated: z.string().optional().nullable().describe('Last update timestamp'),
        last_reported: z.string().optional().nullable().describe('Last reported timestamp'),
        last_scanned_time: z.string().optional().nullable().describe('Last scanned timestamp'),
        ip: z.string().optional().nullable().describe('IP address'),
        mac: z.string().optional().nullable().describe('MAC address'),
        unique_id: z.string().optional().nullable().describe('Unique identifier')
    })
    .passthrough();

const AuthorizeResponseSchema = z
    .object({
        access_token: z.string().optional(),
        user_id: z.union([z.string(), z.number()]).optional(),
        data: z
            .object({
                access_token: z.string().optional(),
                user_id: z.union([z.string(), z.number()]).optional()
            })
            .optional()
    })
    .transform((val) => ({
        access_token: val.access_token ?? val.data?.access_token,
        user_id: val.user_id !== undefined ? String(val.user_id) : val.data?.user_id !== undefined ? String(val.data.user_id) : undefined
    }))
    .refine((val): val is { access_token: string; user_id: string } => typeof val.access_token === 'string' && typeof val.user_id === 'string', {
        message: 'Authorize response missing access_token or user_id'
    });

const AgentSchema = z.object({
    id: z.string(),
    company_id: z.string().optional(),
    host_name: z.string().optional(),
    agent_type: z.string().optional(),
    agent_version: z.string().optional(),
    os_name: z.string().optional(),
    os_platform: z.string().optional(),
    os_version: z.string().optional(),
    status: z.string().optional(),
    created: z.string().optional(),
    updated: z.string().optional(),
    last_reported: z.string().optional(),
    last_scanned_time: z.string().optional(),
    ip: z.string().optional(),
    mac: z.string().optional(),
    unique_id: z.string().optional()
});

const CheckpointSchema = z.object({
    offset: z.number().int().min(0)
});

const sync = createSync({
    description: 'Sync monitoring agents installed across assets in this account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Agent: AgentSchema
    },

    exec: async (nango) => {
        // Blocker: ConnectSecure's /r/company/agents has no incremental/modifiedAfter-style filter parameter.
        const checkpoint = await nango.getCheckpoint();
        let offset: number | undefined = 0;

        if (checkpoint != null) {
            const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint);
            if (!parsedCheckpoint.success) {
                throw new Error(`Invalid checkpoint: ${parsedCheckpoint.error.message}`);
            }
            offset = parsedCheckpoint.data.offset;
        }

        const connection = await nango.getConnection();
        let tenant = connection.connection_config?.['tenant'];
        if (!tenant) {
            const metadata = await nango.getMetadata();
            tenant = metadata?.['tenant'] ?? metadata?.['connection_config']?.['tenant'];
        }

        if (!tenant) {
            throw new Error('Connection config must include tenant.');
        }

        // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
        const authResponse = await nango.post({
            endpoint: '/w/authorize',
            retries: 3
        });

        const authData = AuthorizeResponseSchema.safeParse(authResponse.data);
        if (!authData.success) {
            throw new Error('Failed to obtain access_token or user_id from /w/authorize');
        }

        const token = authData.data.access_token;
        const userId = authData.data.user_id;

        await nango.trackDeletesStart('Agent');

        const proxyConfig: ProxyConfiguration = {
            // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
            endpoint: '/r/company/agents',
            headers: {
                Authorization: `Bearer ${token}`,
                'X-Tenant-Id': tenant,
                'X-User-Id': userId
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'skip',
                offset_calculation_method: 'per-page',
                offset_start_value: offset,
                limit_name_in_request: 'limit',
                limit: 100,
                response_path: 'data',
                on_page: async ({ nextPageParam }) => {
                    offset = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const agents: Array<z.infer<typeof AgentSchema>> = [];
            for (const raw of page) {
                const parsed = ProviderAgentSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse agent: ${parsed.error.message}`);
                }
                const agent = parsed.data;
                agents.push({
                    id: agent.id,
                    ...(agent.company_id != null && { company_id: agent.company_id }),
                    ...(agent.host_name != null && { host_name: agent.host_name }),
                    ...(agent.agent_type != null && { agent_type: agent.agent_type }),
                    ...(agent.agent_version != null && { agent_version: agent.agent_version }),
                    ...(agent.os_name != null && { os_name: agent.os_name }),
                    ...(agent.os_platform != null && { os_platform: agent.os_platform }),
                    ...(agent.os_version != null && { os_version: agent.os_version }),
                    ...(agent.status != null && { status: agent.status }),
                    ...(agent.created != null && { created: agent.created }),
                    ...(agent.updated != null && { updated: agent.updated }),
                    ...(agent.last_reported != null && { last_reported: agent.last_reported }),
                    ...(agent.last_scanned_time != null && { last_scanned_time: agent.last_scanned_time }),
                    ...(agent.ip != null && { ip: agent.ip }),
                    ...(agent.mac != null && { mac: agent.mac }),
                    ...(agent.unique_id != null && { unique_id: agent.unique_id })
                });
            }

            if (agents.length > 0) {
                await nango.batchSave(agents, 'Agent');
            }

            if (offset !== undefined) {
                await nango.saveCheckpoint({ offset });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Agent');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
