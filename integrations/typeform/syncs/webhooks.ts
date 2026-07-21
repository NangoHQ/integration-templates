import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const WebhookSchema = z.object({
    id: z.string(),
    form_id: z.string(),
    tag: z.string(),
    url: z.string(),
    enabled: z.boolean(),
    verify_ssl: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    secret: z.string().optional(),
    event_types: z.record(z.string(), z.boolean()).optional()
});

const CheckpointSchema = z.object({
    form_page: z.number(),
    completed: z.boolean()
});

const TypeformFormItemSchema = z.object({
    id: z.string()
});

const TypeformWebhookSchema = z.object({
    id: z.string(),
    form_id: z.string(),
    tag: z.string(),
    url: z.string(),
    enabled: z.boolean(),
    verify_ssl: z.boolean().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    secret: z.string().optional(),
    event_types: z.record(z.string(), z.boolean()).optional()
});

const TypeformWebhooksResponseSchema = z.object({
    items: z.array(TypeformWebhookSchema)
});

const sync = createSync({
    description: 'Sync webhooks.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Webhook: WebhookSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const isResumed = checkpoint != null && checkpoint.completed === false;
        const formPage = isResumed ? checkpoint.form_page : 1;
        const pageSize = 200;

        if (!isResumed) {
            await nango.trackDeletesStart('Webhook');
        }

        let currentFormPage = formPage;

        const proxyConfig: ProxyConfiguration = {
            // https://www.typeform.com/developers/create/reference/retrieve-forms/
            endpoint: '/forms',
            params: { page_size: pageSize },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: formPage,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'page_size',
                limit: pageSize,
                response_path: 'items'
            },
            retries: 3
        };

        for await (const forms of nango.paginate(proxyConfig)) {
            const validatedForms = z.array(TypeformFormItemSchema).safeParse(forms);
            if (!validatedForms.success) {
                throw new Error(`Forms validation failed: ${validatedForms.error.message}`);
            }

            for (const form of validatedForms.data) {
                // https://www.typeform.com/developers/webhooks/reference/retrieve-webhooks/
                const webhooksResponse = await nango.get({
                    endpoint: `/forms/${encodeURIComponent(form.id)}/webhooks`,
                    retries: 3
                });

                const validatedWebhooks = TypeformWebhooksResponseSchema.safeParse(webhooksResponse.data);
                if (!validatedWebhooks.success) {
                    throw new Error(`Webhooks validation failed for form ${form.id}: ${validatedWebhooks.error.message}`);
                }

                const webhooks = validatedWebhooks.data.items.map((webhook) => ({
                    id: webhook.id,
                    form_id: webhook.form_id,
                    tag: webhook.tag,
                    url: webhook.url,
                    enabled: webhook.enabled,
                    ...(webhook.verify_ssl !== undefined && { verify_ssl: webhook.verify_ssl }),
                    ...(webhook.created_at !== undefined && { created_at: webhook.created_at }),
                    ...(webhook.updated_at !== undefined && { updated_at: webhook.updated_at }),
                    ...(webhook.secret !== undefined && { secret: webhook.secret }),
                    ...(webhook.event_types !== undefined && { event_types: webhook.event_types })
                }));

                if (webhooks.length > 0) {
                    await nango.batchSave(webhooks, 'Webhook');
                }
            }

            currentFormPage++;
            await nango.saveCheckpoint({ form_page: currentFormPage, completed: false });
        }

        await nango.trackDeletesEnd('Webhook');

        await nango.saveCheckpoint({ form_page: 1, completed: true });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
