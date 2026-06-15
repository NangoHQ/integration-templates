import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    accountId: z.string().describe('Zoho Mail account ID. Example: "4845214000000008002"'),
    labelId: z.string().describe('Label ID to retrieve. Example: "2674552000000009029"')
});

const ProviderLabelSchema = z.object({
    sequence: z.number().optional(),
    labelId: z.string(),
    color: z.string().optional(),
    tagId: z.string().optional(),
    displayName: z.string().optional(),
    URI: z.string().optional()
});

const OutputSchema = z.object({
    sequence: z.number().optional(),
    labelId: z.string(),
    color: z.string().optional(),
    tagId: z.string().optional(),
    displayName: z.string().optional(),
    URI: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single label from Zoho Mail.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-label',
        group: 'Labels'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoMail.tags.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.zoho.com/mail/help/api/get-single-label-details.html
            endpoint: `/api/accounts/${encodeURIComponent(input.accountId)}/labels/${encodeURIComponent(input.labelId)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Label not found or the API returned an empty response.',
                accountId: input.accountId,
                labelId: input.labelId
            });
        }

        const providerResponse = z
            .object({
                data: z.unknown()
            })
            .parse(response.data);

        if (!providerResponse.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Label not found.',
                accountId: input.accountId,
                labelId: input.labelId
            });
        }

        const label = ProviderLabelSchema.parse(providerResponse.data);

        return {
            sequence: label.sequence,
            labelId: label.labelId,
            color: label.color,
            tagId: label.tagId,
            displayName: label.displayName,
            URI: label.URI
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
