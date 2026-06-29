import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const LanguageSchema = z.object({
    language_id: z.string(),
    name: z.string()
});

const ModelRatesSchema = z
    .object({
        character_cost_multiplier: z.number().optional(),
        cost_discount_multiplier: z.number().optional()
    })
    .passthrough();

const ProviderModelSchema = z
    .object({
        model_id: z.string(),
        name: z.string(),
        can_be_finetuned: z.boolean().optional(),
        can_do_text_to_speech: z.boolean().optional(),
        can_do_voice_conversion: z.boolean().optional(),
        can_use_style: z.boolean().optional(),
        can_use_speaker_boost: z.boolean().optional(),
        serves_pro_voices: z.boolean().optional(),
        token_cost_factor: z.number().optional(),
        description: z.string().optional(),
        requires_alpha_access: z.boolean().optional(),
        max_characters_request_free_user: z.number().optional(),
        max_characters_request_subscribed_user: z.number().optional(),
        maximum_text_length_per_request: z.number().optional(),
        languages: z.array(LanguageSchema).optional(),
        model_rates: ModelRatesSchema.optional(),
        concurrency_group: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(ProviderModelSchema)
});

const action = createAction({
    description: 'List models.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-models'
    },
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://elevenlabs.io/docs/api-reference/models/list
            endpoint: '/v1/models',
            retries: 3
        });

        const models = z.array(ProviderModelSchema).parse(response.data);

        return {
            items: models
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
