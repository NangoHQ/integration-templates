import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    recordId: z.string().describe('The unique ID of the contact record to delete. Example: "410405000002264040"'),
    wfTrigger: z.boolean().optional().describe('Whether to trigger workflow rules upon deletion. Default is true.')
});

const DeleteResultSchema = z.object({
    code: z.string(),
    details: z.object({
        id: z.string()
    }),
    message: z.string(),
    status: z.string()
});

const ProviderResponseSchema = z.object({
    data: z.array(DeleteResultSchema)
});

const OutputSchema = z.object({
    id: z.string().describe('The ID of the deleted contact'),
    success: z.boolean().describe('Whether the deletion was successful'),
    message: z.string().describe('Status message from the API'),
    archived: z.boolean().describe('Indicates the contact was moved to recycle bin (soft deleted) rather than permanently deleted')
});

const action = createAction({
    description: 'Delete or archive a contact in Zoho CRM',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoCRM.modules.contacts.DELETE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: {
            endpoint: string;
            params: Record<string, string | number | string[] | number[]>;
            retries: number;
        } = {
            // https://www.zoho.com/crm/developer/docs/api/v2/delete-records.html
            endpoint: `crm/v2/Contacts/${input.recordId}`,
            params: {},
            retries: 10
        };

        if (input.wfTrigger !== undefined) {
            config.params['wf_trigger'] = String(input.wfTrigger);
        }

        const response = await nango.delete(config);

        const providerData = ProviderResponseSchema.parse(response.data);

        if (!providerData.data || providerData.data.length === 0) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'The API returned an empty response'
            });
        }

        const result = providerData.data[0];

        if (!result) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'The API returned an empty response'
            });
        }

        if (result.code !== 'SUCCESS') {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: result.message,
                code: result.code,
                recordId: input.recordId
            });
        }

        return {
            id: result.details.id,
            success: result.status === 'success',
            message: result.message,
            archived: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
