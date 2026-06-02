import { createSync } from 'nango';
import { z } from 'zod';

const CapabilitySupportSchema = z.object({
    supported: z.boolean()
});

const ModelCapabilitiesSchema = z
    .object({
        batch: CapabilitySupportSchema.nullable().optional(),
        citations: CapabilitySupportSchema.nullable().optional(),
        code_execution: CapabilitySupportSchema.nullable().optional(),
        context_management: z
            .object({
                supported: z.boolean(),
                clear_thinking_20251015: CapabilitySupportSchema.nullable().optional(),
                clear_tool_uses_20250919: CapabilitySupportSchema.nullable().optional(),
                compact_20260112: CapabilitySupportSchema.nullable().optional()
            })
            .passthrough()
            .nullable()
            .optional(),
        effort: z
            .object({
                supported: z.boolean(),
                high: CapabilitySupportSchema.nullable().optional(),
                low: CapabilitySupportSchema.nullable().optional(),
                max: CapabilitySupportSchema.nullable().optional(),
                medium: CapabilitySupportSchema.nullable().optional(),
                xhigh: CapabilitySupportSchema.nullable().optional()
            })
            .passthrough()
            .nullable()
            .optional(),
        image_input: CapabilitySupportSchema.nullable().optional(),
        pdf_input: CapabilitySupportSchema.nullable().optional(),
        structured_outputs: CapabilitySupportSchema.nullable().optional(),
        thinking: z
            .object({
                supported: z.boolean(),
                types: z
                    .object({
                        adaptive: CapabilitySupportSchema.nullable().optional(),
                        enabled: CapabilitySupportSchema.nullable().optional()
                    })
                    .passthrough()
                    .nullable()
                    .optional()
            })
            .passthrough()
            .nullable()
            .optional()
    })
    .passthrough();

const ProviderModelSchema = z.object({
    id: z.string(),
    capabilities: ModelCapabilitiesSchema.optional(),
    created_at: z.string(),
    display_name: z.string(),
    max_input_tokens: z.number(),
    max_tokens: z.number(),
    type: z.string()
});

const ModelSchema = z.object({
    id: z.string(),
    display_name: z.string(),
    created_at: z.string(),
    max_input_tokens: z.number(),
    max_tokens: z.number(),
    type: z.string(),
    capabilities: ModelCapabilitiesSchema.optional()
});

const ModelListResponseSchema = z.object({
    data: z.array(ProviderModelSchema),
    first_id: z.string().optional(),
    has_more: z.boolean().optional(),
    last_id: z.string().optional()
});

const CheckpointSchema = z
    .object({
        full_refresh: z.boolean(),
        after_id: z.string()
    })
    .strict();

const sync = createSync({
    description: 'Sync models from Anthropic',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    // https://docs.anthropic.com/en/api/models-list
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/models'
        }
    ],
    models: {
        Model: ModelSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        let afterId: string | undefined;

        if (rawCheckpoint != null) {
            const parsedCheckpoint = CheckpointSchema.safeParse(rawCheckpoint);
            if (!parsedCheckpoint.success) {
                throw new Error(`Invalid checkpoint: ${parsedCheckpoint.error.message}`);
            }

            if (parsedCheckpoint.data.full_refresh) {
                afterId = parsedCheckpoint.data.after_id;
            }
        }

        // The models list is newest-first, but it has no updated filter. Keep the sync as a
        // full refresh for correctness and use checkpoints only to resume interrupted runs.
        await nango.trackDeletesStart('Model');

        while (true) {
            const response = await nango.get({
                // https://docs.anthropic.com/en/api/models-list
                endpoint: '/v1/models',
                params: {
                    ...(afterId !== undefined ? { after_id: afterId } : {}),
                    limit: 100
                },
                retries: 3
            });

            const parsedResponse = ModelListResponseSchema.safeParse(response.data);
            if (!parsedResponse.success) {
                throw new Error(`Invalid response from Anthropic models API: ${parsedResponse.error.message}`);
            }

            const page = parsedResponse.data;
            const models = page.data.map((record) => {
                const parsed = ProviderModelSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Invalid model record: ${parsed.error.message}`);
                }

                const model = parsed.data;
                return {
                    id: model.id,
                    display_name: model.display_name,
                    created_at: model.created_at,
                    max_input_tokens: model.max_input_tokens,
                    max_tokens: model.max_tokens,
                    type: model.type,
                    ...(model.capabilities && { capabilities: model.capabilities })
                };
            });

            if (models.length > 0) {
                await nango.batchSave(models, 'Model');
            }

            if (!page.has_more || !page.last_id) {
                break;
            }

            afterId = page.last_id;
            await nango.saveCheckpoint({
                full_refresh: true,
                after_id: afterId
            });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Model');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
