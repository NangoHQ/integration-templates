import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    organization_id: z.string().describe('Zoho Books organization ID. Example: "927270289"')
});

const InputSchema = z.object({
    expense_id: z.string().describe('The expense ID to delete. Example: "260815000000106001"')
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string().optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    message: z.string().optional()
});

const action = createAction({
    description: 'Delete or archive an expense in Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-expense',
        group: 'Expenses'
    },
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['ZohoBooks.expenses.DELETE'],

    exec: async (nango, input) => {
        const metadata = MetadataSchema.parse(await nango.getMetadata());
        const organizationId = metadata.organization_id;

        if (!organizationId) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'organization_id is required in metadata.'
            });
        }

        const response = await nango.delete({
            // https://www.zoho.com/books/api/v3/expenses/#delete-an-expense
            endpoint: `/books/v3/expenses/${encodeURIComponent(input.expense_id)}`,
            params: {
                organization_id: organizationId
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: providerResponse.message || 'Failed to delete expense.'
            });
        }

        return {
            success: true,
            ...(providerResponse.message != null && { message: providerResponse.message })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
