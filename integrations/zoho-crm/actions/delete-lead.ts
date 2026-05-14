import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    record_id: z.string().describe('Lead ID to delete. Example: "3642481000000187001"')
});

const ProviderDeleteResponseSchema = z.object({
    data: z
        .array(
            z.object({
                code: z.string(),
                details: z.object({}).passthrough().optional(),
                message: z.string().optional(),
                status: z.string().optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    message: z.string().optional(),
    record_id: z.string()
});

const action = createAction({
    description: 'Delete or archive a lead in Zoho CRM',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-lead',
        group: 'Leads'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.zoho.com/crm/developer/docs/api/v2/leads/delete.html
        const response = await nango.delete({
            endpoint: `/crm/v2/Leads/${input.record_id}`,
            retries: 1
        });

        const responseData = ProviderDeleteResponseSchema.parse(response.data);

        const dataArray = responseData.data;
        if (dataArray !== undefined && dataArray.length > 0) {
            const result = dataArray[0];
            if (result === undefined) {
                return {
                    success: true,
                    record_id: input.record_id,
                    message: 'Lead deleted successfully'
                };
            }
            const resultCode = result.code;
            const resultMessage = result.message;

            if (resultCode === 'SUCCESS') {
                return {
                    success: true,
                    message: resultMessage || 'Lead deleted successfully',
                    record_id: input.record_id
                };
            }

            if (resultCode === 'RECORD_NOT_FOUND') {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: `Lead with ID "${input.record_id}" was not found`,
                    record_id: input.record_id
                });
            }

            throw new nango.ActionError({
                type: 'delete_failed',
                message: resultMessage || `Failed to delete lead: ${resultCode}`,
                record_id: input.record_id,
                code: resultCode
            });
        }

        return {
            success: true,
            record_id: input.record_id,
            message: 'Lead deleted successfully'
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
