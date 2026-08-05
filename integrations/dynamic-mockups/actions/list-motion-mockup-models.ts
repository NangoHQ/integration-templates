import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({});

const CreditsSchema = z.object({
    audio_off: z.number(),
    audio_on: z.number()
});

const DurationSchema = z.object({
    seconds: z.number(),
    credits: CreditsSchema,
    estimated_time_minutes: z.number()
});

const ModelSchema = z.object({
    value: z.string(),
    display_name: z.string(),
    default_duration: z.string(),
    durations: z.array(DurationSchema),
    aspect_ratios: z.array(z.string()).nullable(),
    default_aspect_ratio: z.string().nullable(),
    supports_aspect_ratio: z.boolean()
});

const ProviderDataSchema = z.object({
    models: z.array(ModelSchema),
    default_model: z.string()
});

const ProviderResponseSchema = z.object({
    data: ProviderDataSchema,
    success: z.boolean(),
    message: z.string()
});

const OutputSchema = z.object({
    models: z.array(ModelSchema),
    default_model: z.string()
});

const action = createAction({
    description: 'List available image-to-video AI models with their supported durations, aspect ratios, and credit costs.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input) => {
        const config: ProxyConfiguration = {
            // https://docs.dynamicmockups.com/api-reference/motionmockups-ai-api
            endpoint: 'v1/motion-mockups/models',
            retries: 3
        };

        const response = await nango.get(config);

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            models: providerResponse.data.models,
            default_model: providerResponse.data.default_model
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
