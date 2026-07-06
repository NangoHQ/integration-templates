import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderModelSchema = z.object({
    name: z.string(),
    baseModelId: z.string().optional(),
    version: z.string().optional(),
    displayName: z.string().optional(),
    description: z.string().optional(),
    inputTokenLimit: z.number().optional(),
    outputTokenLimit: z.number().optional(),
    supportedGenerationMethods: z.array(z.string()).optional(),
    temperature: z.number().optional(),
    topP: z.number().optional(),
    topK: z.number().optional()
});

const ModelSchema = z.object({
    id: z.string(),
    name: z.string(),
    baseModelId: z.string().optional(),
    version: z.string().optional(),
    displayName: z.string().optional(),
    description: z.string().optional(),
    inputTokenLimit: z.number().optional(),
    outputTokenLimit: z.number().optional(),
    supportedGenerationMethods: z.array(z.string()).optional(),
    temperature: z.number().optional(),
    topP: z.number().optional(),
    topK: z.number().optional()
});

const CheckpointSchema = z.object({
    page_token: z.string()
});

const sync = createSync({
    description: 'Sync available Gemini models',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    // https://ai.google.dev/api/models
    checkpoint: CheckpointSchema,
    models: {
        Model: ModelSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        // Blocker: provider only exposes /v1beta/models with no changed-since filter
        // or deleted-record endpoint. We checkpoint the page token so a full refresh
        // can resume safely if interrupted. Delete tracking only runs on fresh
        // (non-resumed) runs to avoid false-deleting records from skipped pages.
        const startingFresh = !checkpoint?.page_token;
        if (startingFresh) {
            await nango.trackDeletesStart('Model');
        }

        let pageToken: string | undefined = checkpoint?.page_token ?? undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://ai.google.dev/api/models#method:-models.list
            endpoint: '/v1beta/models',
            params: {
                ...(pageToken && { pageToken })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'pageToken',
                cursor_path_in_response: 'nextPageToken',
                response_path: 'models',
                limit_name_in_request: 'pageSize',
                limit: 50,
                on_page: async ({ nextPageParam }) => {
                    if (typeof nextPageParam === 'string') {
                        pageToken = nextPageParam;
                    } else {
                        pageToken = undefined;
                    }
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const models = z
                .array(ProviderModelSchema)
                .parse(page)
                .map((model) => ({
                    id: model.name,
                    name: model.name,
                    ...(model.baseModelId !== undefined && { baseModelId: model.baseModelId }),
                    ...(model.version !== undefined && { version: model.version }),
                    ...(model.displayName !== undefined && { displayName: model.displayName }),
                    ...(model.description !== undefined && { description: model.description }),
                    ...(model.inputTokenLimit !== undefined && { inputTokenLimit: model.inputTokenLimit }),
                    ...(model.outputTokenLimit !== undefined && { outputTokenLimit: model.outputTokenLimit }),
                    ...(model.supportedGenerationMethods !== undefined && { supportedGenerationMethods: model.supportedGenerationMethods }),
                    ...(model.temperature !== undefined && { temperature: model.temperature }),
                    ...(model.topP !== undefined && { topP: model.topP }),
                    ...(model.topK !== undefined && { topK: model.topK })
                }));

            if (models.length > 0) {
                await nango.batchSave(models, 'Model');
            }

            if (pageToken) {
                await nango.saveCheckpoint({ page_token: pageToken });
            }
        }

        await nango.clearCheckpoint();
        if (startingFresh) {
            await nango.trackDeletesEnd('Model');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
