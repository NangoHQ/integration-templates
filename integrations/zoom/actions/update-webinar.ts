import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    webinar_id: z.number().describe('The webinar ID in long format. Example: 123456789'),
    occurrence_id: z.string().optional().describe('Webinar occurrence id. Support change of agenda, start_time, duration, settings.'),
    agenda: z.string().optional().describe('Webinar description.'),
    duration: z.number().optional().describe('Webinar duration in minutes. Used for scheduled webinars only.'),
    password: z.string().optional().describe('Webinar passcode. Maximum 10 characters.'),
    start_time: z.string().optional().describe('Webinar start time in ISO 8601 format. Example: 2024-01-15T10:00:00Z'),
    timezone: z.string().optional().describe('Time zone for start_time. Example: America/Los_Angeles'),
    topic: z.string().optional().describe('Webinar topic.'),
    type: z.number().optional().describe('Webinar type: 5 (webinar), 6 (recurring no fixed time), 9 (recurring fixed time).'),
    settings: z
        .object({
            host_video: z.boolean().optional(),
            panelists_video: z.boolean().optional(),
            practice_session: z.boolean().optional(),
            hd_video: z.boolean().optional(),
            auto_recording: z.enum(['local', 'cloud', 'none']).optional(),
            meeting_authentication: z.boolean().optional(),
            approval_type: z.number().optional(),
            registration_type: z.number().optional(),
            on_demand: z.boolean().optional(),
            close_registration: z.boolean().optional(),
            contact_email: z.string().optional(),
            contact_name: z.string().optional(),
            alternative_hosts: z.string().optional()
        })
        .optional()
        .describe('Webinar settings.')
});

const OutputSchema = z.object({
    success: z.boolean(),
    webinar_id: z.number()
});

const action = createAction({
    description: 'Update a webinar in Zoom.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-webinar',
        group: 'Webinars'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['webinar:write:admin', 'webinar:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {};

        if (input.agenda !== undefined) {
            data['agenda'] = input.agenda;
        }
        if (input.duration !== undefined) {
            data['duration'] = input.duration;
        }
        if (input.password !== undefined) {
            data['password'] = input.password;
        }
        if (input.start_time !== undefined) {
            data['start_time'] = input.start_time;
        }
        if (input.timezone !== undefined) {
            data['timezone'] = input.timezone;
        }
        if (input.topic !== undefined) {
            data['topic'] = input.topic;
        }
        if (input.type !== undefined) {
            data['type'] = input.type;
        }
        if (input.settings !== undefined) {
            data['settings'] = input.settings;
        }

        const config: {
            endpoint: string;
            data: Record<string, unknown>;
            retries: number;
            params?: Record<string, string>;
        } = {
            endpoint: `/webinars/${input.webinar_id}`,
            data,
            retries: 3
        };

        if (input.occurrence_id !== undefined) {
            config.params = { occurrence_id: input.occurrence_id };
        }

        // https://developers.zoom.us/docs/api/rest/reference/zoom-api/methods/#operation/webinarUpdate
        await nango.patch(config);

        return {
            success: true,
            webinar_id: input.webinar_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
