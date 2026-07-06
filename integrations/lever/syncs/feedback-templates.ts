import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderFieldSchema = z
    .object({
        id: z.string(),
        type: z.string()
    })
    .passthrough();

const ProviderGroupSchema = z.object({
    id: z.string(),
    name: z.string()
});

const ProviderStageSchema = z.object({
    id: z.string(),
    text: z.string()
});

const ProviderFeedbackTemplateSchema = z.object({
    id: z.string(),
    text: z.string(),
    group: ProviderGroupSchema.nullable().optional(),
    createdAt: z.number().nullable().optional(),
    updatedAt: z.number().nullable().optional(),
    instructions: z.string().optional(),
    stage: ProviderStageSchema.nullable().optional(),
    fields: z.array(ProviderFieldSchema).optional()
});

const FeedbackTemplateSchema = z.object({
    id: z.string(),
    text: z.string(),
    group: z
        .object({
            id: z.string(),
            name: z.string()
        })
        .optional(),
    createdAt: z.number().optional(),
    updatedAt: z.number().optional(),
    instructions: z.string().optional(),
    stage: z
        .object({
            id: z.string(),
            text: z.string()
        })
        .optional(),
    fields: z.array(z.unknown()).optional()
});

const sync = createSync({
    description: 'Fetches all feedback/interview scorecard templates on the account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        FeedbackTemplate: FeedbackTemplateSchema
    },

    exec: async (nango) => {
        // Full refresh required because GET /v1/feedback_templates does not support
        // updated_after or any changed-records filter, and there is no deleted-record
        // endpoint for feedback templates.
        await nango.trackDeletesStart('FeedbackTemplate');

        const proxyConfig: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation#list-all-feedback-templates
            endpoint: '/v1/feedback_templates',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'offset',
                cursor_path_in_response: 'next',
                response_path: 'data',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const templates = page.map((record) => {
                const parsed = ProviderFeedbackTemplateSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Invalid feedback template: ${parsed.error.message}`);
                }

                const t = parsed.data;
                return {
                    id: t.id,
                    text: t.text,
                    ...(t.group != null && { group: t.group }),
                    ...(t.createdAt != null && { createdAt: t.createdAt }),
                    ...(t.updatedAt != null && { updatedAt: t.updatedAt }),
                    ...(t.instructions != null && { instructions: t.instructions }),
                    ...(t.stage != null && { stage: t.stage }),
                    ...(t.fields != null && { fields: t.fields })
                };
            });

            if (templates.length > 0) {
                await nango.batchSave(templates, 'FeedbackTemplate');
            }
        }

        await nango.trackDeletesEnd('FeedbackTemplate');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
