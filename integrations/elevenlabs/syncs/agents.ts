import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ResourceAccessInfoSchema = z.object({
    is_creator: z.boolean(),
    creator_name: z.string(),
    creator_email: z.string(),
    role: z.string(),
    anonymous_access_level_override: z.string().optional().nullable(),
    access_source: z.string().optional().nullable()
});

const AgentSchema = z.object({
    id: z.string(),
    name: z.string(),
    tags: z.array(z.string()).optional(),
    created_at_unix_secs: z.number(),
    access_info: ResourceAccessInfoSchema,
    last_call_time_unix_secs: z.number().optional(),
    archived: z.boolean().optional()
});

const CheckpointSchema = z.object({
    cursor: z.string()
});

const ProviderAgentSchema = z.object({
    agent_id: z.string(),
    name: z.string(),
    tags: z.array(z.string()).optional(),
    created_at_unix_secs: z.number(),
    access_info: z.object({
        is_creator: z.boolean(),
        creator_name: z.string(),
        creator_email: z.string(),
        role: z.string(),
        anonymous_access_level_override: z.string().optional().nullable(),
        access_source: z.string().optional().nullable()
    }),
    last_call_time_unix_secs: z.number().optional().nullable(),
    archived: z.boolean().optional()
});

const sync = createSync({
    description: 'Sync Conversational AI agents',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Agent: AgentSchema
    },
    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const isResuming = checkpoint != null;
        let cursor: string | undefined = isResuming ? CheckpointSchema.parse(checkpoint).cursor : undefined;

        // The ElevenLabs list-agents endpoint does not expose updated or
        // modified filters, so this remains a full refresh. The checkpoint only
        // stores pagination progress so an interrupted crawl can resume.
        // Delete tracking is skipped on resume because a partial enumeration
        // would falsely delete records from pages before the checkpoint cursor.
        if (!isResuming) {
            await nango.trackDeletesStart('Agent');
        }

        const proxyConfig: ProxyConfiguration = {
            // https://elevenlabs.io/docs/api-reference/agents/list
            endpoint: '/v1/convai/agents',
            ...(cursor != null && {
                params: {
                    cursor
                }
            }),
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'next_cursor',
                response_path: 'agents',
                limit_name_in_request: 'page_size',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    if (typeof nextPageParam === 'string') {
                        cursor = nextPageParam;
                    } else {
                        cursor = undefined;
                    }
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const agents = ProviderAgentSchema.array()
                .parse(page)
                .map((agent) => ({
                    id: agent.agent_id,
                    name: agent.name,
                    ...(agent.tags !== undefined && { tags: agent.tags }),
                    created_at_unix_secs: agent.created_at_unix_secs,
                    access_info: {
                        is_creator: agent.access_info.is_creator,
                        creator_name: agent.access_info.creator_name,
                        creator_email: agent.access_info.creator_email,
                        role: agent.access_info.role,
                        ...(agent.access_info.anonymous_access_level_override !== null &&
                            agent.access_info.anonymous_access_level_override !== undefined && {
                                anonymous_access_level_override: agent.access_info.anonymous_access_level_override
                            }),
                        ...(agent.access_info.access_source !== null &&
                            agent.access_info.access_source !== undefined && {
                                access_source: agent.access_info.access_source
                            })
                    },
                    ...(agent.last_call_time_unix_secs !== null &&
                        agent.last_call_time_unix_secs !== undefined && {
                            last_call_time_unix_secs: agent.last_call_time_unix_secs
                        }),
                    ...(agent.archived !== undefined && { archived: agent.archived })
                }));

            if (agents.length > 0) {
                await nango.batchSave(agents, 'Agent');
            }

            if (cursor !== undefined) {
                await nango.saveCheckpoint({ cursor });
            }
        }

        await nango.clearCheckpoint();
        if (!isResuming) {
            await nango.trackDeletesEnd('Agent');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
