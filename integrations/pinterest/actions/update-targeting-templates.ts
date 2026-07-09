import { z } from 'zod';
import { createAction } from 'nango';

const TargetingTemplateUpdateSchema = z.object({
    id: z.string().describe('Targeting template ID. Example: "5841155621960"'),
    operation_type: z.enum(['UPDATE', 'REMOVE']).describe('Operation type. Use UPDATE to modify, REMOVE to archive/delete the template.'),
    targeting_attributes: z.record(z.string(), z.unknown()).optional().describe('Targeting profile attributes to update.')
});

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad account ID. Example: "549770573673"'),
    templates: z.array(TargetingTemplateUpdateSchema).min(1).max(30)
});

const OutputSchema = z.null();

const action = createAction({
    description: 'Update targeting templates',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        for (const template of input.templates) {
            const response = await nango.patch({
                // https://developers.pinterest.com/docs/api/v5/#operation/targeting_template/update
                endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/targeting_templates`,
                data: template,
                retries: 3
            });

            if (response.data && typeof response.data === 'object' && 'items' in response.data) {
                const batchResponse = z
                    .object({
                        items: z.array(
                            z.object({
                                data: z.unknown().optional(),
                                exceptions: z
                                    .array(
                                        z.object({
                                            message: z.string(),
                                            error_code: z.number().optional()
                                        })
                                    )
                                    .optional()
                            })
                        )
                    })
                    .safeParse(response.data);

                if (batchResponse.success) {
                    const failed = batchResponse.data.items.filter((item) => item.exceptions && item.exceptions.length > 0);
                    if (failed.length > 0) {
                        throw new nango.ActionError({
                            type: 'batch_partial_failure',
                            message: `${failed.length} targeting template(s) failed to update.`,
                            failures: failed.map((item) => item.exceptions)
                        });
                    }
                }
            }
        }

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
