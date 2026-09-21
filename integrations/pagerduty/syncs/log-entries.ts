import { createSync } from 'nango';
import { z } from 'zod';

const LogEntrySchema = z
    .object({
        id: z.string().describe('The unique identifier of the log entry.'),
        type: z.string().describe('The type of log entry, such as trigger_log_entry, acknowledge_log_entry, or resolve_log_entry.'),
        summary: z.string().optional().describe('A short-form, server-generated summary of the log entry.'),
        self: z.string().optional().describe('The API URL of the log entry resource.'),
        html_url: z.string().optional().describe('The PagerDuty web UI URL of the log entry.'),
        created_at: z.string().describe('The ISO 8601 timestamp when the log entry was created.'),
        channel: z
            .object({
                type: z.string().describe('The channel type, such as api, email, sms, website, web_trigger, or note.')
            })
            .passthrough()
            .optional()
            .describe('Polymorphic object representing the means by which the action was channeled.'),
        agent: z
            .object({
                id: z.string().describe('The unique identifier of the agent.'),
                type: z.string().describe('The type of agent, such as user_reference, service_reference, or integration_reference.'),
                summary: z.string().optional().describe('A short-form summary of the agent.'),
                self: z.string().optional().describe('The API URL of the agent.'),
                html_url: z.string().optional().describe('The PagerDuty web UI URL of the agent.')
            })
            .optional()
            .describe('The agent (user, service, or integration) that created or modified the log entry.'),
        note: z.string().optional().describe('An optional note included with the log entry.'),
        contexts: z
            .array(
                z.object({
                    type: z.string().describe('The type of context, such as link or image.'),
                    href: z.string().optional().describe('The target URL for a link context.'),
                    src: z.string().optional().describe('The source URL for an image context.'),
                    text: z.string().optional().describe('The alternate display text for an image context.')
                })
            )
            .optional()
            .describe('Contexts attached to the incident trigger such as links to graphs or images.'),
        service: z
            .object({
                id: z.string().describe('The unique identifier of the service.'),
                type: z.string().describe('The type of object, such as service_reference.'),
                summary: z.string().optional().describe('A short-form summary of the service.'),
                self: z.string().optional().describe('The API URL of the service.'),
                html_url: z.string().optional().describe('The PagerDuty web UI URL of the service.')
            })
            .optional()
            .describe('The service associated with the log entry.'),
        incident: z
            .object({
                id: z.string().describe('The unique identifier of the incident.'),
                type: z.string().describe('The type of object, such as incident_reference.'),
                summary: z.string().optional().describe('A short-form summary of the incident.'),
                self: z.string().optional().describe('The API URL of the incident.'),
                html_url: z.string().optional().describe('The PagerDuty web UI URL of the incident.')
            })
            .optional()
            .describe('The incident associated with the log entry.'),
        teams: z
            .array(
                z.object({
                    id: z.string().describe('The unique identifier of the team.'),
                    type: z.string().describe('The type of object, such as team_reference.'),
                    summary: z.string().optional().describe('A short-form summary of the team.'),
                    self: z.string().optional().describe('The API URL of the team.'),
                    html_url: z.string().optional().describe('The PagerDuty web UI URL of the team.')
                })
            )
            .optional()
            .describe('The teams associated with the log entry.'),
        event_details: z
            .object({
                description: z.string().optional().describe('Additional details about the event.')
            })
            .optional()
            .describe('Additional event details present on trigger log entries.'),
        changeset: z.array(z.string()).optional().describe('String records of custom field updates for field-value-change log entries.'),
        user: z
            .object({
                id: z.string().describe('The unique identifier of the user.'),
                type: z.string().describe('The type of object, such as user_reference.'),
                summary: z.string().optional().describe('A short-form summary of the user.'),
                self: z.string().optional().describe('The API URL of the user.'),
                html_url: z.string().optional().describe('The PagerDuty web UI URL of the user.')
            })
            .optional()
            .describe('The user notified on notify_log_entry types.')
    })
    .describe('A single log entry representing an event that happened to an incident.');

const CheckpointSchema = z.object({
    offset: z.number().int()
});

function normalizeNulls(value: unknown): unknown {
    if (value === null) {
        return undefined;
    }
    if (Array.isArray(value)) {
        return value.map(normalizeNulls).filter((v) => v !== undefined);
    }
    if (typeof value === 'object' && value !== null) {
        const result: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(value)) {
            const normalized = normalizeNulls(val);
            if (normalized !== undefined) {
                result[key] = normalized;
            }
        }
        return result;
    }
    return value;
}

const sync = createSync({
    description: 'Sync the account-wide log entries feed (every incident/alert state-change event across the account).',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        LogEntry: LogEntrySchema
    },

    exec: async (nango) => {
        const checkpointRaw = await nango.getCheckpoint();
        let currentOffset = 0;
        if (checkpointRaw != null) {
            const checkpoint = CheckpointSchema.safeParse(checkpointRaw);
            if (!checkpoint.success) {
                throw new Error(`Invalid checkpoint: ${checkpoint.error.message}`);
            }
            currentOffset = checkpoint.data.offset;
        }

        // Blocker: provider only exposes /log_entries with no changed-since filter,
        // no deleted-record endpoint, and no resumable cursor. since/until bound created_at,
        // not an updated-since filter.
        await nango.trackDeletesStart('LogEntry');

        let nextOffset;

        // https://developer.pagerduty.com/api-reference/
        for await (const pageResults of nango.paginate({
            endpoint: '/log_entries',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_start_value: currentOffset,
                limit_name_in_request: 'limit',
                limit: 100,
                response_path: 'log_entries',
                on_page: async ({ nextPageParam }) => {
                    nextOffset = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        })) {
            const logEntries = [];

            for (const raw of pageResults) {
                const normalized = normalizeNulls(raw);
                const parsed = LogEntrySchema.safeParse(normalized);
                if (!parsed.success) {
                    throw new Error(`Failed to parse log entry: ${parsed.error.message}`);
                }
                logEntries.push(parsed.data);
            }

            if (logEntries.length > 0) {
                await nango.batchSave(logEntries, 'LogEntry');
            }

            // Save pagination progress after every page. Without this, a run that
            // exceeds the execution window restarts from offset 0 next time instead of
            // resuming where it left off.
            if (typeof nextOffset === 'number') {
                await nango.saveCheckpoint({ offset: nextOffset });
                currentOffset = nextOffset;
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('LogEntry');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
