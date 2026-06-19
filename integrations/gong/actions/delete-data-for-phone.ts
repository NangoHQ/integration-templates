import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    phoneNumber: z.string().describe('Phone number to erase data for. Example: "+15550000001"')
});

const ProviderResponseSchema = z.object({
    requestId: z.string()
});

const OutputSchema = z.object({
    requestId: z.string().describe('Async deletion request ID')
});

const action = createAction({
    description: 'Erase all Gong data associated with a phone number (GDPR / data privacy)',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:data-privacy:delete'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://help.gong.io/docs/what-the-gong-api-provides
        const response = await nango.post({
            endpoint: '/v2/data-privacy/erase-data-for-phone-number',
            params: {
                phoneNumber: input.phoneNumber
            },
            retries: 10
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            requestId: providerData.requestId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
