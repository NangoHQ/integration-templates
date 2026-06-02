import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const LogEntrySchema = z.object({
    id: z.string(),
    date: z.string().optional(),
    type: z.string().optional(),
    description: z.string().optional(),
    connection: z.string().optional(),
    connection_id: z.string().optional(),
    client_id: z.string().optional(),
    client_name: z.string().optional(),
    ip: z.string().optional(),
    hostname: z.string().optional(),
    user_id: z.string().optional(),
    user_name: z.string().optional(),
    audience: z.string().optional(),
    scope: z.string().optional(),
    strategy: z.string().optional(),
    strategy_type: z.string().optional(),
    isMobile: z.boolean().optional(),
    user_agent: z.string().optional(),
    details: z.record(z.string(), z.unknown()).optional(),
    security_context: z.record(z.string(), z.unknown()).optional(),
    location_info: z.record(z.string(), z.unknown()).optional()
});

const CheckpointSchema = z.object({
    from: z.string()
});

const sync = createSync({
    description: 'Sync log entries from Auth0',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    // https://auth0.com/docs/api/management/v2/logs/get-logs
    endpoints: [{ method: 'GET', path: '/syncs/log-entries' }],
    checkpoint: CheckpointSchema,
    models: {
        LogEntry: LogEntrySchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const from = checkpoint?.from;

        const proxyConfig: ProxyConfiguration = {
            // https://auth0.com/docs/api/management/v2/logs/get-logs
            endpoint: '/api/v2/logs',
            params: {
                ...(from && { from }),
                take: 50
            },
            paginate: {
                type: 'link',
                link_rel_in_response_header: 'next',
                limit_name_in_request: 'take',
                limit: 50
            },
            retries: 3
        };

        for await (const page of nango.paginate<{
            log_id: string;
            date?: string | null;
            type?: string | null;
            description?: string | null;
            connection?: string | null;
            connection_id?: string | null;
            client_id?: string | null;
            client_name?: string | null;
            ip?: string | null;
            hostname?: string | null;
            user_id?: string | null;
            user_name?: string | null;
            audience?: string | null;
            scope?: string | null;
            strategy?: string | null;
            strategy_type?: string | null;
            isMobile?: boolean | null;
            user_agent?: string | null;
            details?: Record<string, unknown> | null;
            security_context?: Record<string, unknown> | null;
            location_info?: Record<string, unknown> | null;
        }>(proxyConfig)) {
            if (page.length === 0) {
                break;
            }

            const logEntries = page.map((log) => ({
                id: log.log_id,
                ...(log.date != null && { date: log.date }),
                ...(log.type != null && { type: log.type }),
                ...(log.description != null && { description: log.description }),
                ...(log.connection != null && { connection: log.connection }),
                ...(log.connection_id != null && { connection_id: log.connection_id }),
                ...(log.client_id != null && { client_id: log.client_id }),
                ...(log.client_name != null && { client_name: log.client_name }),
                ...(log.ip != null && { ip: log.ip }),
                ...(log.hostname != null && { hostname: log.hostname }),
                ...(log.user_id != null && { user_id: log.user_id }),
                ...(log.user_name != null && { user_name: log.user_name }),
                ...(log.audience != null && { audience: log.audience }),
                ...(log.scope != null && { scope: log.scope }),
                ...(log.strategy != null && { strategy: log.strategy }),
                ...(log.strategy_type != null && { strategy_type: log.strategy_type }),
                ...(log.isMobile != null && { isMobile: log.isMobile }),
                ...(log.user_agent != null && { user_agent: log.user_agent }),
                ...(log.details != null && { details: log.details }),
                ...(log.security_context != null && { security_context: log.security_context }),
                ...(log.location_info != null && { location_info: log.location_info })
            }));

            await nango.batchSave(logEntries, 'LogEntry');

            const lastLog = logEntries[logEntries.length - 1];
            if (lastLog?.id) {
                await nango.saveCheckpoint({ from: lastLog.id });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
