import { createSync, ProxyConfiguration } from 'nango';
import { z } from 'zod';

const FormItemSchema = z
    .object({
        id: z.string()
    })
    .passthrough();

const ProviderResponseItemSchema = z
    .object({
        token: z.string(),
        landing_id: z.string(),
        landed_at: z.string().optional(),
        submitted_at: z.string().optional(),
        answers: z.array(z.record(z.string(), z.unknown())).optional(),
        calculated: z.record(z.string(), z.unknown()).optional(),
        hidden: z.record(z.string(), z.unknown()).optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
        variables: z.array(z.record(z.string(), z.unknown())).optional()
    })
    .passthrough();

const ResponsesListSchema = z.object({
    total_items: z.number(),
    page_count: z.number(),
    items: z.array(ProviderResponseItemSchema)
});

const CheckpointSchema = z.object({
    after_tokens_json: z.string()
});

const ResponseSchema = z
    .object({
        id: z.string(),
        form_id: z.string(),
        token: z.string(),
        landing_id: z.string(),
        landed_at: z.string().optional(),
        submitted_at: z.string().optional(),
        answers: z.array(z.record(z.string(), z.unknown())).optional(),
        calculated: z.record(z.string(), z.unknown()).optional(),
        hidden: z.record(z.string(), z.unknown()).optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
        variables: z.array(z.record(z.string(), z.unknown())).optional()
    })
    .passthrough();

const sync = createSync({
    description: 'Sync responses.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Response: ResponseSchema
    },
    scopes: ['responses:read'],

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint != null ? CheckpointSchema.parse(rawCheckpoint) : null;

        const afterTokens: Record<string, string> = {};
        if (checkpoint != null) {
            const parsed = JSON.parse(checkpoint.after_tokens_json);
            const tokenRecord = z.record(z.string(), z.string()).safeParse(parsed);
            if (tokenRecord.success) {
                for (const [key, value] of Object.entries(tokenRecord.data)) {
                    afterTokens[key] = value;
                }
            }
        }

        const formsProxyConfig: ProxyConfiguration = {
            // https://www.typeform.com/developers/create/reference/retrieve-forms/
            endpoint: '/forms',
            params: {
                page_size: 200
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'page_size',
                limit: 200,
                response_path: 'items'
            },
            retries: 3
        };

        for await (const page of nango.paginate(formsProxyConfig)) {
            const forms = z.array(FormItemSchema).parse(page);

            for (const form of forms) {
                let afterToken = afterTokens[form.id];

                let hasMore = true;
                while (hasMore) {
                    // Only completed responses are immutable, so they are safe to page through with an
                    // exclusive `after` token. Partial/started responses can later be updated or completed,
                    // and once their token is checkpointed past, that update would never be re-fetched.
                    const params: Record<string, string | number> = {
                        page_size: 1000,
                        response_type: 'completed'
                    };
                    if (afterToken) {
                        params['after'] = afterToken;
                    }

                    // https://www.typeform.com/developers/responses/reference/retrieve-responses/
                    const response = await nango.get({
                        endpoint: `/forms/${encodeURIComponent(form.id)}/responses`,
                        params,
                        retries: 3
                    });

                    const parsed = ResponsesListSchema.parse(response.data);
                    const items = parsed.items;

                    if (items.length === 0) {
                        hasMore = false;
                        break;
                    }

                    const mapped = items.map((item) => ({
                        id: item.token,
                        form_id: form.id,
                        token: item.token,
                        landing_id: item.landing_id,
                        ...(item.landed_at != null && { landed_at: item.landed_at }),
                        ...(item.submitted_at != null && { submitted_at: item.submitted_at }),
                        ...(item.answers != null && { answers: item.answers }),
                        ...(item.calculated != null && { calculated: item.calculated }),
                        ...(item.hidden != null && { hidden: item.hidden }),
                        ...(item.metadata != null && { metadata: item.metadata }),
                        ...(item.variables != null && { variables: item.variables })
                    }));

                    await nango.batchSave(mapped, 'Response');

                    const lastToken = items[items.length - 1]?.token;
                    if (!lastToken || items.length < 1000) {
                        afterToken = lastToken;
                        hasMore = false;
                        break;
                    }

                    afterToken = lastToken;
                    afterTokens[form.id] = afterToken;
                    await nango.saveCheckpoint({ after_tokens_json: JSON.stringify(afterTokens) });
                }

                if (afterToken) {
                    afterTokens[form.id] = afterToken;
                    await nango.saveCheckpoint({ after_tokens_json: JSON.stringify(afterTokens) });
                }
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
