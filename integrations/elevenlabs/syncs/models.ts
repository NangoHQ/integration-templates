import { createSync } from 'nango';
import { z } from 'zod';

const ProviderLanguageSchema = z.object({
    language_id: z.string(),
    name: z.string()
});

const ProviderModelRatesSchema = z.object({
    character_cost_multiplier: z.number(),
    cost_discount_multiplier: z.number().optional()
});

const ProviderModelSchema = z.object({
    model_id: z.string(),
    name: z.string().optional(),
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
    languages: z.array(ProviderLanguageSchema).optional(),
    model_rates: ProviderModelRatesSchema.optional(),
    concurrency_group: z.string().optional()
});

const ModelSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
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
    languages: z.array(ProviderLanguageSchema).optional(),
    model_rates: ProviderModelRatesSchema.optional(),
    concurrency_group: z.string().optional()
});

const sync = createSync({
    description: 'Sync models.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Model: ModelSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/models'
        }
    ],

    exec: async (nango) => {
        // Blocker: GET /v1/models returns a flat array with no changed-since filter,
        // no deleted-record endpoint, no resumable cursor, and no pagination parameters.
        await nango.trackDeletesStart('Model');

        // https://elevenlabs.io/docs/api-reference/models/list
        const response = await nango.get({
            endpoint: '/v1/models',
            retries: 3
        });

        const rawModels = z.array(ProviderModelSchema).parse(response.data);

        const models = rawModels.map((model) => ({
            id: model.model_id,
            ...(model.name != null && { name: model.name }),
            ...(model.can_be_finetuned != null && { can_be_finetuned: model.can_be_finetuned }),
            ...(model.can_do_text_to_speech != null && { can_do_text_to_speech: model.can_do_text_to_speech }),
            ...(model.can_do_voice_conversion != null && { can_do_voice_conversion: model.can_do_voice_conversion }),
            ...(model.can_use_style != null && { can_use_style: model.can_use_style }),
            ...(model.can_use_speaker_boost != null && { can_use_speaker_boost: model.can_use_speaker_boost }),
            ...(model.serves_pro_voices != null && { serves_pro_voices: model.serves_pro_voices }),
            ...(model.token_cost_factor != null && { token_cost_factor: model.token_cost_factor }),
            ...(model.description != null && { description: model.description }),
            ...(model.requires_alpha_access != null && { requires_alpha_access: model.requires_alpha_access }),
            ...(model.max_characters_request_free_user != null && { max_characters_request_free_user: model.max_characters_request_free_user }),
            ...(model.max_characters_request_subscribed_user != null && {
                max_characters_request_subscribed_user: model.max_characters_request_subscribed_user
            }),
            ...(model.maximum_text_length_per_request != null && { maximum_text_length_per_request: model.maximum_text_length_per_request }),
            ...(model.languages != null && { languages: model.languages }),
            ...(model.model_rates != null && { model_rates: model.model_rates }),
            ...(model.concurrency_group != null && { concurrency_group: model.concurrency_group })
        }));

        if (models.length > 0) {
            await nango.batchSave(models, 'Model');
        }

        await nango.trackDeletesEnd('Model');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
