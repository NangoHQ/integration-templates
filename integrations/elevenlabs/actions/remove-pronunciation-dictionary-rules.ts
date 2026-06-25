import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    pronunciation_dictionary_id: z.string().describe('The ID of the pronunciation dictionary. Example: "pronunciation_dictionary_id"'),
    rule_strings: z.array(z.string()).describe('List of strings to remove from the pronunciation dictionary. Example: ["tomato", "Tomato"]')
});

const ProviderResponseSchema = z.object({
    id: z.string(),
    version_id: z.string(),
    version_rules_num: z.number()
});

const OutputSchema = z.object({
    id: z.string(),
    version_id: z.string(),
    version_rules_num: z.number()
});

const action = createAction({
    description: 'Remove rules from a pronunciation dictionary.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://elevenlabs.io/docs/api-reference/pronunciation-dictionaries/rules/remove
            endpoint: `/v1/pronunciation-dictionaries/${encodeURIComponent(input.pronunciation_dictionary_id)}/remove-rules`,
            data: {
                rule_strings: input.rule_strings
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            id: providerResponse.id,
            version_id: providerResponse.version_id,
            version_rules_num: providerResponse.version_rules_num
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
