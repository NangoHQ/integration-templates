import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    query: z.string().describe('The question to answer. Example: "What is the capital of France?"'),
    text: z.boolean().optional().describe('If true, each citation object includes the full page text.')
});

const CitationSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    url: z.string().optional(),
    text: z.string().optional()
});

const OutputSchema = z.object({
    answer: z.string().describe('The AI-generated answer, may contain markdown.'),
    citations: z.array(CitationSchema).describe('Citations backing the answer.')
});

const ProviderCitationSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    url: z.string().optional(),
    text: z.string().optional()
});

const ProviderResponseSchema = z.object({
    answer: z.string(),
    citations: z.array(ProviderCitationSchema).optional()
});

const action = createAction({
    description: 'Generate an AI answer to a question, backed by live web citations.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        path: '/actions/answer',
        method: 'POST'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {
            query: input.query
        };

        if (input.text !== undefined) {
            requestBody['text'] = input.text;
        }

        const config: ProxyConfiguration = {
            // https://docs.exa.ai/reference
            endpoint: '/answer',
            data: requestBody,
            retries: 3
        };

        const response = await nango.post(config);

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            answer: providerResponse.answer,
            citations: providerResponse.citations || []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
