import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    contactId: z.string().describe('Contact ID. Example: "jKy701hlSIPdiw0x12WA"'),
    workflowId: z.string().describe('Workflow ID. Example: "bac2d2c5-358a-44c6-909d-e4411d171cf8"')
});

const ProviderResponseSchema = z.object({
    succeeded: z.boolean()
});

const OutputSchema = z.object({
    succeeded: z.boolean()
});

const action = createAction({
    description: 'Remove a contact from a HighLevel workflow',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contacts.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://highlevel.stoplight.io/docs/integrations/
            endpoint: `/contacts/${encodeURIComponent(input.contactId)}/workflow/${encodeURIComponent(input.workflowId)}`,
            headers: {
                Version: '2021-07-28'
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            succeeded: providerResponse.succeeded
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
