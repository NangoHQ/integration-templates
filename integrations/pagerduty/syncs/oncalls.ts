import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderReferenceSchema = z.object({
    id: z.string(),
    type: z.string(),
    summary: z.string().optional(),
    self: z.string().optional(),
    html_url: z.string().optional()
});

const ProviderOnCallSchema = z.object({
    // PagerDuty's Oncall schema does not mark any field as required, and in practice `user` can be omitted/null.
    user: ProviderReferenceSchema.nullable().optional(),
    escalation_policy: ProviderReferenceSchema.nullable().optional(),
    escalation_level: z.number().int().nullable().optional(),
    schedule: ProviderReferenceSchema.nullable().optional(),
    start: z.string().nullable(),
    end: z.string().nullable()
});

const OnCallSchema = z
    .object({
        id: z.string().describe('Stable composite identifier for this on-call assignment, derived from user, schedule, escalation policy, start, and end.'),
        user_id: z.string().describe('PagerDuty user ID of the person currently on-call.'),
        user_summary: z.string().optional().describe('Display name of the on-call user.'),
        escalation_policy_id: z.string().optional().describe('ID of the escalation policy governing this on-call assignment, if any.'),
        escalation_policy_summary: z.string().optional().describe('Name of the escalation policy, if any.'),
        escalation_level: z.number().int().optional().describe('Escalation level within the policy (1 is the first level).'),
        schedule_id: z.string().optional().describe('ID of the schedule rotation producing this on-call, if applicable.'),
        schedule_summary: z.string().optional().describe('Name of the schedule, if applicable.'),
        start: z.string().describe('ISO 8601 timestamp when this on-call shift begins.').optional(),
        end: z.string().describe('ISO 8601 timestamp when this on-call shift ends.').optional()
    })
    .describe(
        'A point-in-time on-call assignment representing a single user covering a specific time window within an escalation policy and optional schedule.'
    );

const CheckpointSchema = z
    .object({
        offset: z.number().int().nonnegative().describe('Offset value to resume pagination from in the next execution window.')
    })
    .describe('Pagination checkpoint for resuming an interrupted full-refresh on-calls crawl.');

const sync = createSync({
    description: 'Sync the current on-call snapshot across every escalation policy and schedule on the account.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    scopes: ['oncalls.read'],
    checkpoint: CheckpointSchema,
    models: {
        OnCall: OnCallSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint == null ? undefined : CheckpointSchema.parse(rawCheckpoint);
        const startOffset = checkpoint?.offset ?? 0;
        let nextOffset: number | undefined = startOffset;

        await nango.trackDeletesStart('OnCall');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.pagerduty.com/api-reference/
            endpoint: '/oncalls',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_start_value: startOffset,
                limit_name_in_request: 'limit',
                response_path: 'oncalls',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    nextOffset = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const oncalls = page
                .map((record: unknown) => {
                    const parsed = ProviderOnCallSchema.safeParse(record);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse on-call record: ${parsed.error.message}`);
                    }

                    const data = parsed.data;
                    const user = data.user;
                    const ep = data.escalation_policy;
                    const schedule = data.schedule;

                    // The OnCall model requires user_id; an entry with no user on-call cannot be represented and
                    // would crash on `user.id` below, so it is skipped rather than emitted or force-parsed.
                    if (user == null) {
                        return undefined;
                    }

                    const id = [user.id, ep?.id ?? 'no-ep', schedule?.id ?? 'no-schedule', data.start, data.end].join(':');

                    return {
                        id,
                        user_id: user.id,
                        ...(user.summary !== undefined && { user_summary: user.summary }),
                        ...(ep?.id !== undefined && { escalation_policy_id: ep.id }),
                        ...(ep?.summary !== undefined && { escalation_policy_summary: ep.summary }),
                        ...(data.escalation_level !== null &&
                            data.escalation_level !== undefined && {
                                escalation_level: data.escalation_level
                            }),
                        ...(schedule?.id !== undefined && { schedule_id: schedule.id }),
                        ...(schedule?.summary !== undefined && { schedule_summary: schedule.summary }),
                        ...(data.start !== null && { start: data.start }),
                        ...(data.end !== null && { end: data.end })
                    };
                })
                .filter((oncall): oncall is NonNullable<typeof oncall> => oncall !== undefined);

            if (oncalls.length > 0) {
                await nango.batchSave(oncalls, 'OnCall');
            }

            if (nextOffset !== undefined) {
                await nango.saveCheckpoint({ offset: nextOffset });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('OnCall');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
