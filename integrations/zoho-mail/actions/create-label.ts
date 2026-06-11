import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    accountId: z.string().describe('Zoho Mail account ID. Example: "4845214000000008002"'),
    labelName: z.string().min(1).describe('Name of the label to create. Example: "Important"'),
    color: z.string().optional().describe('Hex color code for the label. Example: "#FF0000"')
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            labelId: z.string().optional(),
            displayName: z.string().optional(),
            color: z.string().optional()
        })
        .passthrough()
        .optional()
});

const OutputSchema = z.object({
    labelId: z.string().optional(),
    labelName: z.string().optional(),
    color: z.string().optional()
});

const action = createAction({
    description: 'Create a label in Zoho Mail',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-label',
        group: 'Labels'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['zohomail.labels.CREATE'],

    exec: async (nango, input) => {
        const response = await nango.post({
            // https://www.zoho.com/mail/help/api/
            endpoint: `/api/accounts/${encodeURIComponent(input.accountId)}/labels`,
            data: {
                displayName: input.labelName,
                ...(input.color !== undefined && { color: input.color })
            },
            retries: 10
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const labelData = providerResponse.data;

        if (!labelData) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Unexpected response from Zoho Mail API: missing label data'
            });
        }

        return {
            ...(labelData.labelId !== undefined && { labelId: labelData.labelId }),
            ...(labelData.displayName !== undefined && { labelName: labelData.displayName }),
            ...(labelData.color !== undefined && { color: labelData.color })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
