import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ScheduleLayerUserSchema = z
    .object({
        id: z.string().describe('The unique identifier of the user'),
        type: z.string().describe('The type of the user reference object'),
        summary: z.string().optional().describe('A short summary of the user'),
        self: z.string().optional().describe('The API URL for the user resource'),
        html_url: z.string().optional().describe('The PagerDuty web URL for the user resource')
    })
    .describe('A user reference within a schedule layer or schedule');

const ScheduleLayerSchema = z
    .object({
        id: z.string().describe('The unique identifier of the schedule layer'),
        // PagerDuty's ScheduleLayer object does not include a `type` field (confirmed against the live API and the
        // official OpenAPI spec), so this must stay optional or every layer fails to parse once schedule_layers is
        // actually populated (see the `include[]=schedule_layers` param added below).
        type: z.string().optional().describe('The type of the schedule layer object, if present.'),
        start: z.string().describe('The start date and time of the schedule layer in ISO 8601 format'),
        end: z.string().nullable().optional().describe('The end date and time of the schedule layer, null if ongoing'),
        rotation_virtual_start: z.string().describe('The effective start date and time of the rotation for this layer'),
        rotation_turn_length_seconds: z.number().describe('The length of each rotation turn in seconds'),
        users: z
            .array(
                z
                    .object({
                        user: ScheduleLayerUserSchema.describe('The user assigned to this schedule layer')
                    })
                    .describe('A wrapper object containing a user assignment for the schedule layer')
            )
            .describe('List of user assignments for this schedule layer'),
        restrictions: z.array(z.unknown()).optional().describe('Time-based restrictions applied to this schedule layer')
    })
    .describe('A layer within an on-call schedule defining rotation rules');

const ScheduleEscalationPolicySchema = z
    .object({
        id: z.string().describe('The unique identifier of the escalation policy'),
        type: z.string().describe('The type of the escalation policy reference object'),
        summary: z.string().optional().describe('A short summary of the escalation policy'),
        self: z.string().optional().describe('The API URL for the escalation policy resource'),
        html_url: z.string().optional().describe('The PagerDuty web URL for the escalation policy resource')
    })
    .describe('An escalation policy reference associated with a schedule');

const ScheduleTeamSchema = z
    .object({
        id: z.string().describe('The unique identifier of the team'),
        type: z.string().describe('The type of the team reference object'),
        summary: z.string().optional().describe('A short summary of the team'),
        self: z.string().optional().describe('The API URL for the team resource'),
        html_url: z.string().optional().describe('The PagerDuty web URL for the team resource')
    })
    .describe('A team reference associated with a schedule');

const ScheduleSchema = z
    .object({
        id: z.string().describe('The unique identifier of the on-call schedule'),
        type: z.string().describe('The type of the schedule object'),
        name: z.string().describe('The name of the on-call schedule'),
        description: z.string().nullable().optional().describe('A description of the on-call schedule'),
        time_zone: z.string().describe('The time zone in which the schedule is evaluated'),
        schedule_layers: z.array(ScheduleLayerSchema).optional().describe('The ordered list of schedule layers defining on-call rotations'),
        escalation_policies: z.array(ScheduleEscalationPolicySchema).optional().describe('Escalation policies that use this schedule'),
        teams: z.array(ScheduleTeamSchema).optional().describe('Teams associated with this schedule'),
        users: z.array(ScheduleLayerUserSchema).optional().describe('Users directly associated with this schedule'),
        html_url: z.string().optional().describe('The PagerDuty web URL for this schedule'),
        self: z.string().optional().describe('The API URL for this schedule resource')
    })
    .describe('An on-call schedule defining when users are on duty');

const CheckpointSchema = z.object({
    offset: z.number().int().nonnegative()
});

const sync = createSync({
    description: "Sync on-call schedules (legacy/v2 schedule model), including each schedule's layers and assigned users",
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    scopes: ['schedules.read'],
    checkpoint: CheckpointSchema,
    models: {
        Schedule: ScheduleSchema
    },

    exec: async (nango) => {
        const checkpointRaw = await nango.getCheckpoint();
        const checkpoint = checkpointRaw == null ? undefined : CheckpointSchema.parse(checkpointRaw);
        const startOffset = checkpoint?.offset ?? 0;

        // Blocker: GET /schedules has no modified-since or updated-after filter.
        // This stays full-refresh, but an interrupted crawl can resume from the last
        // saved offset instead of restarting from page 1.
        let offset: number | undefined = startOffset;

        await nango.trackDeletesStart('Schedule');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.pagerduty.com/api-reference/reference/REST/openapiv3.json/paths/~1schedules/get
            endpoint: '/schedules',
            // Without this, PagerDuty returns base schedules only, omitting schedule_layers (and thus the assigned
            // users) that this sync promises to sync.
            params: { 'include[]': 'schedule_layers' },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_start_value: startOffset,
                limit_name_in_request: 'limit',
                limit: 2,
                response_path: 'schedules',
                on_page: async (args) => {
                    offset = typeof args.nextPageParam === 'number' ? args.nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const schedules = page.map((record) => {
                const parsed = ScheduleSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse schedule: ${parsed.error.message}`);
                }
                return parsed.data;
            });

            if (schedules.length > 0) {
                await nango.batchSave(schedules, 'Schedule');
            }

            if (offset !== undefined) {
                await nango.saveCheckpoint({ offset });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Schedule');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
