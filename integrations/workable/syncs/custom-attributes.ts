import { createSync } from 'nango';
import { z } from 'zod';

const TranslationSchema = z.object({
    body: z.string().optional(),
    hint: z.string().optional()
});

const ChoiceSchema = z.object({
    id: z.string(),
    body: z.string().nullish(),
    hint: z.string().nullish(),
    translations: z.record(z.string(), TranslationSchema).optional()
});

const ProviderCustomAttributeSchema = z.object({
    id: z.string(),
    type: z.string(),
    enabled: z.boolean(),
    label: z.string().nullish(),
    hint: z.string().nullish(),
    single_answer: z.boolean().nullish(),
    choices: z.array(ChoiceSchema).optional()
});

const ProviderResponseSchema = z.object({
    custom_attributes: z.array(ProviderCustomAttributeSchema)
});

const CustomAttributeSchema = z.object({
    id: z.string(),
    type: z.string(),
    enabled: z.boolean(),
    label: z.string().optional(),
    hint: z.string().optional(),
    single_answer: z.boolean().optional(),
    choices: z.array(ChoiceSchema).optional()
});

type CustomAttribute = z.infer<typeof CustomAttributeSchema>;
type Choice = z.infer<typeof ChoiceSchema>;

const sync = createSync({
    description: 'Sync account-level custom attribute definitions',
    version: '1.0.0',
    frequency: 'every day',
    autoStart: true,
    models: {
        CustomAttribute: CustomAttributeSchema
    },

    exec: async (nango) => {
        await nango.trackDeletesStart('CustomAttribute');

        // https://workable.readme.io/reference/custom_attributes
        const response = await nango.get({
            endpoint: '/spi/v3/custom_attributes',
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Invalid response from Workable custom_attributes: ${parsed.error.message}`);
        }

        const attributes = parsed.data.custom_attributes.map((attr) => {
            const mapped: CustomAttribute = {
                id: attr.id,
                type: attr.type,
                enabled: attr.enabled
            };
            if (attr.label != null) {
                mapped.label = attr.label;
            }
            if (attr.hint != null) {
                mapped.hint = attr.hint;
            }
            if (attr.single_answer != null) {
                mapped.single_answer = attr.single_answer;
            }
            if (attr.choices != null) {
                mapped.choices = attr.choices.map((choice) => {
                    const mappedChoice: Choice = {
                        id: choice.id
                    };
                    if (choice.body != null) {
                        mappedChoice.body = choice.body;
                    }
                    if (choice.hint != null) {
                        mappedChoice.hint = choice.hint;
                    }
                    if (choice.translations != null) {
                        mappedChoice.translations = choice.translations;
                    }
                    return mappedChoice;
                });
            }
            return mapped;
        });

        if (attributes.length > 0) {
            await nango.batchSave(attributes, 'CustomAttribute');
        }

        await nango.trackDeletesEnd('CustomAttribute');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
