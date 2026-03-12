import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    deal_id: z.string().describe('The ID of the deal to delete. Example: "12345"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    message: z.string()
});

const action = createAction({
    description: 'Delete a deal record',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/delete-deal',
        group: 'Deals'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['crm.objects.deals.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.hubspot.com/docs/api-reference/crm/deals
        await nango.delete({
            endpoint: `/crm/v3/objects/deals/${input.deal_id}`,
            retries: 10
        });

        return {
            success: true,
            message: `Deal ${input.deal_id} deleted successfully`
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
