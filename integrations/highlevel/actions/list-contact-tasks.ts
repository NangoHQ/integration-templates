import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    contactId: z.string().describe('Contact ID. Example: "jKy701hlSIPdiw0x12WA"')
});

const ProviderTaskSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    body: z.string().optional(),
    assignedTo: z.string().optional(),
    dueDate: z.string().optional(),
    completed: z.boolean().optional(),
    contactId: z.string().optional()
});

const OutputSchema = z.object({
    tasks: z.array(ProviderTaskSchema)
});

const action = createAction({
    description: 'List follow-up tasks on a contact',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contacts.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://highlevel.stoplight.io/docs/integrations/Contacts/Tasks/get-all-tasks
            endpoint: `/contacts/${encodeURIComponent(input.contactId)}/tasks`,
            headers: {
                Version: '2021-07-28'
            },
            retries: 3
        });

        const providerData = z
            .object({
                tasks: z.array(ProviderTaskSchema)
            })
            .parse(response.data);

        return {
            tasks: providerData.tasks
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
