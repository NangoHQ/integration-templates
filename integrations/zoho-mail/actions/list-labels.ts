import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    accountId: z.string().describe('Account ID. Example: "4845214000000008002"')
});

const LabelSchema = z.object({
    labelId: z.string(),
    displayName: z.string().optional(),
    color: z.string().optional(),
    sequence: z.number().optional(),
    tagId: z.string().optional(),
    URI: z.string().optional()
});

const OutputSchema = z.object({
    labels: z.array(LabelSchema)
});

const action = createAction({
    description: 'List all labels for an account in Zoho Mail.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-labels',
        group: 'Labels'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['zohomail.messages.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.zoho.com/mail/help/api/
        const response = await nango.get({
            endpoint: `/api/accounts/${encodeURIComponent(input.accountId)}/labels`,
            retries: 3
        });

        const ResponseSchema = z.object({
            data: z.array(LabelSchema).optional()
        });

        const parsed = ResponseSchema.parse(response.data);

        return {
            labels: parsed.data ?? []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
