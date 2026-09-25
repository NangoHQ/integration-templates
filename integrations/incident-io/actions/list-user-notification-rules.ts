import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://api.incident.io/v1/openapiV3.json
// Operation: Users V2#ListNotificationRules
const InputSchema = z.object({ user_id: z.string() }).passthrough();

const ProviderResponseSchema = z
    .object({
        notification_rules: z.array(
            z
                .object({
                    app: z
                        .object({ push_notification_criticality: z.enum(['critical', 'active']) })
                        .passthrough()
                        .optional(),
                    delay_seconds: z.number().int().min(0).max(1200).optional(),
                    id: z.string(),
                    method_target: z
                        .object({
                            all: z.object({}).passthrough().optional(),
                            specific: z.object({ id: z.string() }).passthrough().optional(),
                            type: z.enum(['specific', 'all'])
                        })
                        .passthrough(),
                    method_type: z.enum(['app', 'email', 'microsoft_teams', 'phone', 'slack', 'whatsapp_message']),
                    phone: z
                        .object({ channel: z.enum(['sms', 'voice']) })
                        .passthrough()
                        .optional(),
                    rule_type: z.enum(['high_urgency', 'low_urgency'])
                })
                .passthrough()
        )
    })
    .passthrough();
const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description: 'List user notification rules in incident.io.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://api.incident.io/v1/openapiV3.json,
            endpoint: `/v2/users/${encodeURIComponent(input['user_id'])}/notification_rules`,
            retries: 3
        };
        const response = await nango.get(config);
        const data = ProviderResponseSchema.parse(response.data);
        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
