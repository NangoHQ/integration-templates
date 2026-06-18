import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    site_id: z.string().describe('SharePoint site ID. Example: "contoso.sharepoint.com,site-id"'),
    list_id: z.string().describe('SharePoint list ID. Example: "list-id"'),
    item_id: z.string().describe('SharePoint list item ID. Example: "1"'),
    fields: z.record(z.string(), z.unknown()).describe('Field values keyed by internal column name.')
});

const ProviderFieldValueSetSchema = z.record(z.string(), z.unknown());

const OutputSchema = z.object({
    site_id: z.string(),
    list_id: z.string(),
    item_id: z.string(),
    fields: z.record(z.string(), z.unknown())
});

const action = createAction({
    description: 'Update fields on a SharePoint list item.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Sites.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://learn.microsoft.com/graph/api/listitem-update
            endpoint: `/v1.0/sites/${encodeURIComponent(input.site_id)}/lists/${encodeURIComponent(input.list_id)}/items/${encodeURIComponent(input.item_id)}/fields`,
            data: input.fields,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response from Microsoft Graph when updating list item fields.'
            });
        }

        const providerFields = ProviderFieldValueSetSchema.parse(response.data);

        return {
            site_id: input.site_id,
            list_id: input.list_id,
            item_id: input.item_id,
            fields: providerFields
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
