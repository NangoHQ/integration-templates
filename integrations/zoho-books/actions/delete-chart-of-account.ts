import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    account_id: z.string().describe('ID of the chart of account to delete. Example: "260815000000000388"')
});

const MetadataSchema = z.object({
    organization_id: z.string().describe('Zoho Books organization ID. Example: "927270289"')
});

const ProviderDeleteResponseSchema = z.object({
    code: z.number(),
    message: z.string()
});

const OutputSchema = z.object({
    code: z.number(),
    message: z.string()
});

const action = createAction({
    description: 'Delete a chart of account entry in Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-chart-of-account',
        group: 'Chart of Accounts'
    },
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['ZohoBooks.accountants.ALL'],

    exec: async (nango, input) => {
        const metadata = MetadataSchema.safeParse(await nango.getMetadata());

        if (!metadata.success || !metadata.data.organization_id) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'organization_id is required in metadata.'
            });
        }

        const organizationId = metadata.data.organization_id;

        const response = await nango.delete({
            // https://www.zoho.com/books/api/v3/chartofaccounts/#delete-an-account
            endpoint: `/books/v3/chartofaccounts/${encodeURIComponent(input.account_id)}`,
            params: {
                organization_id: organizationId
            },
            retries: 3
        });

        const providerData = ProviderDeleteResponseSchema.parse(response.data);

        return {
            code: providerData.code,
            message: providerData.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
