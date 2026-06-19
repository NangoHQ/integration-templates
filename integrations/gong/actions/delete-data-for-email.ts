import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    emailAddress: z.string().describe('Email address to erase from Gong. Example: "user@example.com"')
});

const ProviderResponseSchema = z.object({
    requestId: z.string().describe('Async deletion request ID. Example: "123e4567-e89b-12d3-a456-426614174000"')
});

const OutputSchema = z.object({
    requestId: z.string().describe('Async deletion request ID. Example: "123e4567-e89b-12d3-a456-426614174000"')
});

const action = createAction({
    description: 'Erase all Gong data associated with an email address (GDPR / data privacy).',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:data-privacy:delete'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://help.gong.io/docs/what-the-gong-api-provides
        const response = await nango.post({
            endpoint: '/v2/data-privacy/erase-data-for-email-address',
            params: {
                emailAddress: input.emailAddress
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            requestId: providerResponse.requestId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
