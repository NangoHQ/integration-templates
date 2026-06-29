import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    url: z.string().url().describe('HTTPS endpoint URL for the webhook subscription. Example: "https://example.com/webhook"'),
    events: z.array(z.string().describe('Event string in the format "action.object_type", e.g. "create.lead", "update.contact", "delete.opportunity"')).min(1),
    verify_ssl: z.boolean().optional().describe('Whether to verify the SSL certificate of the destination URL. Defaults to true.')
});

const ProviderWebhookEventSchema = z.object({
    action: z.string(),
    object_type: z.string(),
    extra_filter: z.unknown().optional().nullable()
});

const ProviderWebhookSchema = z.object({
    id: z.string(),
    url: z.string(),
    events: z.array(ProviderWebhookEventSchema),
    verify_ssl: z.boolean().nullish(),
    status: z.string().nullish(),
    health_status: z.string().nullish(),
    signature_key: z.string().nullish(),
    created_by: z.string().nullish(),
    updated_by: z.string().nullish(),
    date_created: z.string().nullish(),
    date_updated: z.string().nullish(),
    latest_error: z.string().nullish(),
    pause_reason: z.string().nullish(),
    counters: z.record(z.string(), z.unknown()).nullish(),
    recent_consecutive_fail_buckets_cnt: z.number().nullish()
});

const OutputSchema = z.object({
    id: z.string(),
    url: z.string(),
    events: z.array(
        z.object({
            action: z.string(),
            object_type: z.string()
        })
    ),
    verify_ssl: z.boolean().optional(),
    status: z.string().optional(),
    health_status: z.string().optional(),
    signature_key: z.string().optional(),
    created_by: z.string().optional(),
    updated_by: z.string().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional()
});

const action = createAction({
    description: 'Create a new webhook subscription.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const mappedEvents = input.events.map((eventStr) => {
            const firstDot = eventStr.indexOf('.');
            if (firstDot === -1) {
                throw new nango.ActionError({
                    type: 'invalid_event',
                    message: `Event "${eventStr}" must be in the format "action.object_type".`
                });
            }
            const rawAction = eventStr.slice(0, firstDot);
            const objectType = eventStr.slice(firstDot + 1);
            const actionMap: Record<string, string> = {
                create: 'created',
                update: 'updated',
                delete: 'deleted'
            };
            const action = actionMap[rawAction] ?? rawAction;
            return {
                action,
                object_type: objectType
            };
        });

        const response = await nango.post({
            // https://developer.close.com/api/resources/webhooks/create
            endpoint: '/v1/webhook/',
            data: {
                url: input.url,
                events: mappedEvents,
                ...(input.verify_ssl !== undefined && { verify_ssl: input.verify_ssl })
            },
            retries: 3
        });

        const providerWebhook = ProviderWebhookSchema.parse(response.data);

        return {
            id: providerWebhook.id,
            url: providerWebhook.url,
            events: providerWebhook.events.map((e) => ({
                action: e.action,
                object_type: e.object_type
            })),
            ...(providerWebhook.verify_ssl != null && { verify_ssl: providerWebhook.verify_ssl }),
            ...(providerWebhook.status != null && { status: providerWebhook.status }),
            ...(providerWebhook.health_status != null && { health_status: providerWebhook.health_status }),
            ...(providerWebhook.signature_key != null && { signature_key: providerWebhook.signature_key }),
            ...(providerWebhook.created_by != null && { created_by: providerWebhook.created_by }),
            ...(providerWebhook.updated_by != null && { updated_by: providerWebhook.updated_by }),
            ...(providerWebhook.date_created != null && { date_created: providerWebhook.date_created }),
            ...(providerWebhook.date_updated != null && { date_updated: providerWebhook.date_updated })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
