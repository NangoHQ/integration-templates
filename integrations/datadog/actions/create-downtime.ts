import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    scope: z.string().describe('Scope of the downtime. Example: "host:my-host" or "*"'),
    start: z.string().describe('Start time in ISO-8601 with UTC offset of zero. Example: "2026-08-03T14:12:10Z"'),
    end: z.string().describe('End time in ISO-8601 with UTC offset of zero. Example: "2026-08-03T15:12:10Z"'),
    monitor_tags: z.array(z.string()).optional().describe('Monitor tags to suppress. Example: ["*"]'),
    monitor_id: z.number().optional().describe('Specific monitor ID to suppress.'),
    message: z.string().optional().describe('Optional message for the downtime.')
});

const ScheduleSchema = z.object({
    start: z.string(),
    end: z.string()
});

const MonitorIdentifierSchema = z
    .object({
        monitor_tags: z.array(z.string()).optional(),
        monitor_id: z.number().optional()
    })
    .passthrough();

const ProviderAttributesSchema = z
    .object({
        scope: z.string(),
        schedule: ScheduleSchema,
        monitor_identifier: MonitorIdentifierSchema.optional().nullable(),
        message: z.string().optional().nullable(),
        status: z.string().optional().nullable(),
        mute_first_recovery_notification: z.boolean().optional().nullable(),
        created: z.string().optional().nullable(),
        modified: z.string().optional().nullable()
    })
    .passthrough();

const ProviderDataSchema = z.object({
    type: z.string(),
    id: z.string(),
    attributes: ProviderAttributesSchema
});

const ProviderResponseSchema = z.object({
    data: ProviderDataSchema
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    scope: z.string(),
    schedule: ScheduleSchema,
    monitor_identifier: MonitorIdentifierSchema.optional(),
    message: z.string().optional(),
    status: z.string().optional(),
    mute_first_recovery_notification: z.boolean().optional(),
    created: z.string().optional(),
    modified: z.string().optional()
});

const action = createAction({
    description: 'Schedule a downtime (maintenance window) that suppresses monitor notifications for a scope/time range.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const monitorIdentifier: { monitor_tags?: string[]; monitor_id?: number } = {};
        if (input.monitor_tags !== undefined) {
            monitorIdentifier.monitor_tags = input.monitor_tags;
        }
        if (input.monitor_id !== undefined) {
            monitorIdentifier.monitor_id = input.monitor_id;
        }

        const attributes: {
            scope: string;
            schedule: { start: string; end: string };
            monitor_identifier?: typeof monitorIdentifier;
            message?: string;
        } = {
            scope: input.scope,
            schedule: {
                start: input.start,
                end: input.end
            }
        };

        if (Object.keys(monitorIdentifier).length > 0) {
            attributes.monitor_identifier = monitorIdentifier;
        }
        if (input.message !== undefined) {
            attributes.message = input.message;
        }

        const body = {
            data: {
                type: 'downtime',
                attributes
            }
        };

        // https://docs.datadoghq.com/api/latest/downtimes/#schedule-a-downtime
        const response = await nango.post({
            endpoint: 'v2/downtime',
            data: body,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const attrs = providerResponse.data.attributes;

        return {
            id: providerResponse.data.id,
            type: providerResponse.data.type,
            scope: attrs.scope,
            schedule: attrs.schedule,
            ...(attrs.monitor_identifier != null && { monitor_identifier: attrs.monitor_identifier }),
            ...(attrs.message != null && { message: attrs.message }),
            ...(attrs.status != null && { status: attrs.status }),
            ...(attrs.mute_first_recovery_notification != null && { mute_first_recovery_notification: attrs.mute_first_recovery_notification }),
            ...(attrs.created != null && { created: attrs.created }),
            ...(attrs.modified != null && { modified: attrs.modified })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
