import { createSync } from 'nango';
import { z } from 'zod';

// https://platform.openai.com/docs/api-reference/models/object
const ModelSchema = z.object({
    id: z.string(),
    object: z.string().optional(),
    created: z.number().optional(),
    owned_by: z.string().optional()
});

const ProviderResponseSchema = z.object({
    object: z.string().optional(),
    data: z.array(z.unknown())
});

const sync = createSync({
    description: 'Sync models from OpenAI.',
    frequency: 'every hour',
    endpoints: [
        {
            path: '/syncs/models',
            method: 'GET'
        }
    ],
    models: {
        Model: ModelSchema
    },

    exec: async (nango) => {
        // https://platform.openai.com/docs/api-reference/models/list
        // Start delete tracking only after a successful response so a network or parse
        // failure doesn't leave tracking open without a matching trackDeletesEnd.
        const response = await nango.get({
            endpoint: '/v1/models',
            retries: 3
        });

        const validated = ProviderResponseSchema.parse(response.data);

        await nango.trackDeletesStart('Model');
        const rawModels = validated.data;

        const models: Array<{
            id: string;
            object?: string;
            created?: number;
            owned_by?: string;
        }> = [];

        for (const raw of rawModels) {
            const parsed = ModelSchema.safeParse(raw);
            if (!parsed.success) {
                throw new Error(`Failed to parse model: ${parsed.error.message}`);
            }
            models.push({
                id: parsed.data.id,
                ...(parsed.data.object !== undefined && { object: parsed.data.object }),
                ...(parsed.data.created !== undefined && { created: parsed.data.created }),
                ...(parsed.data.owned_by !== undefined && { owned_by: parsed.data.owned_by })
            });
        }

        if (models.length > 0) {
            await nango.batchSave(models, 'Model');
        }

        await nango.trackDeletesEnd('Model');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
