import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        userId: z.string().optional().describe('The user ID or email address of the user. For user-level apps, pass "me". Defaults to "me".'),
        topic: z.string().max(200).describe('Webinar topic.'),
        type: z
            .union([z.literal(5), z.literal(6), z.literal(9)])
            .optional()
            .describe('Webinar type: 5 (Webinar), 6 (Recurring no fixed time), 9 (Recurring fixed time). Defaults to 5.'),
        start_time: z.string().optional().describe('Webinar start time in ISO 8601 format. Required for type 5 and 9.'),
        duration: z.number().int().optional().describe('Webinar duration in minutes.'),
        agenda: z.string().optional().describe('Webinar agenda.'),
        timezone: z.string().optional().describe('Time zone to format start_time.'),
        password: z.string().max(10).optional().describe('Webinar passcode.'),
        settings: z
            .object({
                host_video: z.boolean().optional(),
                panelists_video: z.boolean().optional(),
                practice_session: z.boolean().optional(),
                hd_video: z.boolean().optional(),
                auto_recording: z.enum(['local', 'cloud', 'none']).optional(),
                approval_type: z.number().int().optional()
            })
            .optional()
            .describe('Webinar settings.')
    })
    .superRefine((data, ctx) => {
        const effectiveType = data.type ?? 5;
        if ((effectiveType === 5 || effectiveType === 9) && !data.start_time) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'start_time is required for webinar type 5 (Webinar) and type 9 (Recurring fixed time)',
                path: ['start_time']
            });
        }
    });

const OccurrenceSchema = z.object({
    duration: z.number().int().optional(),
    occurrence_id: z.string().optional(),
    start_time: z.string().optional(),
    status: z.string().optional()
});

const RecurrenceSchema = z.object({
    end_date_time: z.string().optional(),
    end_times: z.number().int().optional(),
    monthly_day: z.number().int().optional(),
    monthly_week: z.number().int().optional(),
    monthly_week_day: z.number().int().optional(),
    repeat_interval: z.number().int().optional(),
    type: z.number().int(),
    weekly_days: z.string().optional()
});

const SettingsSchema = z.object({
    allow_multiple_devices: z.boolean().optional(),
    alternative_hosts: z.string().optional(),
    approval_type: z.number().int().optional(),
    audio: z.string().optional(),
    auto_recording: z.string().optional(),
    close_registration: z.boolean().optional(),
    contact_email: z.string().optional(),
    contact_name: z.string().optional(),
    email_language: z.string().optional(),
    enforce_login: z.boolean().optional(),
    enforce_login_domains: z.string().optional(),
    hd_video: z.boolean().optional(),
    host_video: z.boolean().optional(),
    meeting_authentication: z.boolean().optional(),
    on_demand: z.boolean().optional(),
    panelists_invitation_email_notification: z.boolean().optional(),
    panelists_video: z.boolean().optional(),
    practice_session: z.boolean().optional(),
    registrants_confirmation_email: z.boolean().optional(),
    registrants_email_notification: z.boolean().optional(),
    registrants_restrict_number: z.number().int().optional(),
    registration_type: z.number().int().optional(),
    show_share_button: z.boolean().optional(),
    survey_url: z.string().optional()
});

const TrackingFieldSchema = z.object({
    field: z.string().optional(),
    value: z.string().optional()
});

const ProviderResponseSchema = z.object({
    host_email: z.string().optional(),
    host_id: z.string().optional(),
    id: z.number().int().optional(),
    uuid: z.string().optional(),
    agenda: z.string().optional(),
    created_at: z.string().optional(),
    duration: z.number().int().optional(),
    join_url: z.string().optional(),
    occurrences: z.array(OccurrenceSchema).optional(),
    password: z.string().optional(),
    recurrence: RecurrenceSchema.optional(),
    settings: SettingsSchema.optional(),
    start_time: z.string().optional(),
    start_url: z.string().optional(),
    timezone: z.string().optional(),
    topic: z.string().optional(),
    tracking_fields: z.array(TrackingFieldSchema).optional(),
    type: z.number().int().optional()
});

const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description: 'Create a webinar in Zoom.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-webinar',
        group: 'Webinars'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['webinar:write', 'webinar:write:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const userId = input.userId ?? 'me';

        const requestBody: Record<string, unknown> = {
            topic: input.topic
        };

        if (input.type !== undefined) {
            requestBody['type'] = input.type;
        }
        if (input.start_time !== undefined) {
            requestBody['start_time'] = input.start_time;
        }
        if (input.duration !== undefined) {
            requestBody['duration'] = input.duration;
        }
        if (input.agenda !== undefined) {
            requestBody['agenda'] = input.agenda;
        }
        if (input.timezone !== undefined) {
            requestBody['timezone'] = input.timezone;
        }
        if (input.password !== undefined) {
            requestBody['password'] = input.password;
        }
        if (input.settings !== undefined) {
            requestBody['settings'] = input.settings;
        }

        const config: ProxyConfiguration = {
            // https://marketplace.zoom.us/docs/api-reference/zoom-api/webinars/webinarcreate
            endpoint: `/users/${userId}/webinars`,
            data: requestBody,
            retries: 3
        };

        const response = await nango.post(config);

        const providerData = ProviderResponseSchema.parse(response.data);

        return providerData;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
