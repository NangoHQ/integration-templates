import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    contactId: z.string().describe('Contact ID. Example: "jKy701hlSIPdiw0x12WA"'),
    taskId: z.string().describe('Task ID. Example: "ocQHyuzHvysMo5N5VsXc"')
});

const ProviderResponseSchema = z.object({
    succeded: z.boolean().optional()
});

const OutputSchema = z.object({
    succeded: z.boolean().optional()
});

const action = createAction({
    description: 'Delete a follow-up task from a contact.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contacts.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://highlevel.stoplight.io/docs/integrations/
            endpoint: `/contacts/${encodeURIComponent(input.contactId)}/tasks/${encodeURIComponent(input.taskId)}`,
            headers: {
                Version: '2021-07-28'
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            ...(providerResponse.succeded !== undefined && { succeded: providerResponse.succeded })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
