import { createSync } from 'nango';
import { z } from 'zod';

const ProviderFormWebhookSchema = z
    .object({
        id: z.number(),
        form_id: z.number(),
        url: z.string(),
        name: z.string().nullish(),
        format: z.string().nullish(),
        signing_secret: z.string().nullish(),
        trigger_when_spam: z.boolean().nullish(),
        enabled: z.boolean().nullish(),
        failure_count: z.number().nullish(),
        last_failure_at: z.string().nullish(),
        created_at: z.string().nullish(),
        updated_at: z.string().nullish()
    })
    .passthrough();

const FormWebhookSchema = z.object({
    id: z.string(),
    form_id: z.string(),
    url: z.string(),
    name: z.string().optional(),
    format: z.string().optional(),
    signing_secret: z.string().optional(),
    trigger_when_spam: z.boolean().optional(),
    enabled: z.boolean().optional(),
    failure_count: z.number().optional(),
    last_failure_at: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const CheckpointSchema = z.object({
    page: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync webhooks configured across forms in this account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        FormWebhook: FormWebhookSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : null;

        let trackingStarted = false;
        let page = checkpoint?.page ?? 1;

        while (true) {
            const response = await nango.get({
                // https://docs.usebasin.com/developer-features/api-reference/
                endpoint: '/v1/form_webhooks/',
                params: {
                    page
                },
                retries: 3
            });

            const parsedBody = z
                .object({
                    form_webhooks: z.array(ProviderFormWebhookSchema),
                    meta: z
                        .object({
                            count: z.number().optional(),
                            page: z.number().optional(),
                            per_page: z.number().optional()
                        })
                        .optional()
                })
                .safeParse(response.data);

            if (!parsedBody.success) {
                throw new Error(`Failed to parse form webhooks response: ${parsedBody.error.message}`);
            }

            if (!trackingStarted) {
                // Basin paginates the full list but exposes no changed-since filter or deleted feed.
                // Started here (after the first page validates) and on every execution of a
                // checkpointed run, so a resumed invocation stays inside the active delete window.
                await nango.trackDeletesStart('FormWebhook');
                trackingStarted = true;
            }

            const records = parsedBody.data.form_webhooks.map((record) => ({
                id: String(record.id),
                form_id: String(record.form_id),
                url: record.url,
                ...(record.name != null && { name: record.name }),
                ...(record.format != null && { format: record.format }),
                ...(record.signing_secret != null && { signing_secret: record.signing_secret }),
                ...(record.trigger_when_spam != null && { trigger_when_spam: record.trigger_when_spam }),
                ...(record.enabled != null && { enabled: record.enabled }),
                ...(record.failure_count != null && { failure_count: record.failure_count }),
                ...(record.last_failure_at != null && { last_failure_at: record.last_failure_at }),
                ...(record.created_at != null && { created_at: record.created_at }),
                ...(record.updated_at != null && { updated_at: record.updated_at })
            }));

            if (records.length > 0) {
                await nango.batchSave(records, 'FormWebhook');
            }

            if (records.length === 0) {
                break;
            }

            page += 1;
            await nango.saveCheckpoint({ page });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('FormWebhook');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
