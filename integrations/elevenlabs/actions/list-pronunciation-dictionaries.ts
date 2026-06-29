import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const PronunciationDictionarySchema = z.object({
    id: z.string(),
    latest_version_id: z.string(),
    latest_version_rules_num: z.number(),
    name: z.string(),
    permission_on_resource: z.string(),
    created_by: z.string(),
    creation_time_unix: z.number(),
    archived_time_unix: z.number().nullable().optional(),
    description: z.string().optional()
});

const ProviderResponseSchema = z.object({
    pronunciation_dictionaries: z.array(PronunciationDictionarySchema),
    next_cursor: z.string().optional().nullable(),
    has_more: z.boolean().optional()
});

const OutputSchema = z.object({
    pronunciation_dictionaries: z.array(PronunciationDictionarySchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List pronunciation dictionaries.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://elevenlabs.io/docs/api-reference/pronunciation-dictionaries/list
            endpoint: '/v1/pronunciation-dictionaries',
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            pronunciation_dictionaries: providerResponse.pronunciation_dictionaries,
            ...(providerResponse.next_cursor != null && { next_cursor: providerResponse.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
