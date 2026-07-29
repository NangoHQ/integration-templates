import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    groupId: z.string().describe('Workspace ID. Example: "149ca924-4333-471b-94b5-347eca3f9938"'),
    datasetId: z.string().describe('Dataset ID. Example: "a71c1b98-a0db-4423-a81b-5dcb48d5c8d1"'),
    notifyOption: z
        .enum(['NoNotification', 'MailOnFailure', 'MailOnCompletion'])
        .optional()
        .describe('Notification option for refresh completion. Defaults to NoNotification.')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Trigger a refresh of a dataset.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Dataset.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/rest/api/power-bi/datasets/refresh-dataset
            endpoint: `/v1.0/myorg/groups/${encodeURIComponent(input.groupId)}/datasets/${encodeURIComponent(input.datasetId)}/refreshes`,
            data: {
                notifyOption: input.notifyOption ?? 'NoNotification'
            },
            retries: 3
        };

        await nango.post(config);

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
