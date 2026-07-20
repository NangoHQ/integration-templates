import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    contactId: z.string().describe('Contact ID. Example: "jKy701hlSIPdiw0x12WA"'),
    workflowId: z.string().describe('Workflow ID. Example: "bac2d2c5-358a-44c6-909d-e4411d171cf8"')
});

const ProviderResponseSchema = z.object({
    succeeded: z.boolean().optional()
});

const OutputSchema = z.object({
    succeeded: z.boolean()
});

const action = createAction({
    description: 'Enroll a contact in a HighLevel workflow.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contacts.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://github.com/GoHighLevel/highlevel-api-docs/tree/main/apps
            endpoint: `/contacts/${encodeURIComponent(input.contactId)}/workflow/${encodeURIComponent(input.workflowId)}`,
            headers: {
                Version: '2021-07-28'
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            succeeded: parsed.succeeded ?? true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
