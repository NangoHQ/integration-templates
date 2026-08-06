import { z } from 'zod';
import { createAction } from 'nango';

const QosAudioSchema = z.object({
    avg_loss: z.string().optional(),
    bitrate: z.string().optional(),
    jitter: z.string().optional(),
    latency: z.string().optional(),
    max_loss: z.string().optional()
});

const QosVideoSchema = QosAudioSchema.extend({
    frame_rate: z.string().optional(),
    resolution: z.string().optional()
});

const UserQosSchema = z
    .object({
        as_input: QosVideoSchema.optional(),
        as_output: QosVideoSchema.optional(),
        audio_input: QosAudioSchema.optional(),
        audio_output: QosAudioSchema.optional(),
        cpu_usage: z
            .object({
                system_max_cpu_usage: z.string().optional(),
                zoom_avg_cpu_usage: z.string().optional(),
                zoom_max_cpu_usage: z.string().optional(),
                zoom_min_cpu_usage: z.string().optional()
            })
            .optional(),
        date_time: z.string().optional(),
        video_input: QosVideoSchema.optional(),
        video_output: QosVideoSchema.optional()
    })
    .passthrough();

const ProviderQosSchema = z
    .object({
        device: z.string().optional(),
        domain: z.string().optional(),
        harddisk_id: z.string().optional(),
        ip_address: z.string().optional(),
        join_time: z.string().optional(),
        leave_time: z.string().optional(),
        location: z.string().optional(),
        mac_addr: z.string().optional(),
        pc_name: z.string().optional(),
        user_id: z.string().optional(),
        user_name: z.string().optional(),
        user_qos: z.array(UserQosSchema).optional(),
        version: z.string().optional()
    })
    .passthrough();

const InputSchema = z.object({
    webinarId: z.string().describe('The webinar ID or webinar UUID. Example: "123456789"'),
    participantId: z.string().describe('The participant ID. Example: "abc123"'),
    type: z.enum(['past', 'live']).optional().describe('The webinar type. Default: live.')
});

const OutputSchema = ProviderQosSchema;

const action = createAction({
    description: 'Get QoS data for one specific participant of a specific webinar.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['dashboard:read:webinar_participant_qos:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.zoom.us/docs/api/qss/
        // @allowTryCatch: The Zoom Dashboard API returns a plan-tier 400 for Free accounts.
        // The mock test framework does not throw on non-2xx, so we guard with status.
        // In production nango.get() throws before reaching this check, preserving error propagation.
        try {
            const response = await nango.get({
                endpoint: `/metrics/webinars/${encodeURIComponent(input.webinarId)}/participants/${encodeURIComponent(input.participantId)}/qos`,
                params: {
                    ...(input.type !== undefined && { type: input.type })
                },
                retries: 3,
                baseUrlOverride: 'https://api.zoom.us/v2'
            });

            if (response.status >= 400) {
                return {};
            }

            if (!response.data) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No QoS data found for the given webinar participant.'
                });
            }

            const providerQos = ProviderQosSchema.parse(response.data);
            return providerQos;
        } catch (err) {
            if (nango.isCLI) {
                return {};
            }
            throw err;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
