import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad account ID. Example: "549770573673"'),
    label_type: z.enum(['BRAND', 'CUSTOM']).describe('Label type. Example: "CUSTOM"'),
    value: z.string().max(100).describe('Label name. 100-character limit. Example: "My Label"')
});

const ProviderLabelSchema = z.object({
    id: z.string().optional(),
    label_type: z.enum(['BRAND', 'CUSTOM', 'NULL']).nullable().optional(),
    status: z.enum(['ACTIVE', 'ARCHIVED', 'NULL']).nullable().optional(),
    value: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string().optional(),
    label_type: z.enum(['BRAND', 'CUSTOM', 'NULL']).nullable().optional(),
    status: z.enum(['ACTIVE', 'ARCHIVED', 'NULL']).nullable().optional(),
    value: z.string().optional()
});

const action = createAction({
    description: 'Create ad-entity labels.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const adAccountId = input.ad_account_id;
        const labelType = input.label_type;
        const labelValue = input.value;

        const response = await nango.post({
            // https://developers.pinterest.com/docs/api/v5/#tag/labels/operation/labels_create
            endpoint: `/v5/ad_accounts/${encodeURIComponent(adAccountId)}/labels`,
            data: {
                labels: [
                    {
                        label_type: labelType,
                        value: labelValue
                    }
                ]
            },
            retries: 1
        });

        const providerResponse = z
            .object({
                labels: z.array(ProviderLabelSchema).optional(),
                errors: z
                    .array(
                        z.object({
                            data: ProviderLabelSchema.optional(),
                            error_messages: z.array(z.string()).optional()
                        })
                    )
                    .optional()
            })
            .safeParse(response.data);

        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Pinterest API'
            });
        }

        const parsedData = providerResponse.data;
        const labels = parsedData.labels;
        const errors = parsedData.errors;

        if (errors !== undefined && errors.length > 0) {
            const firstError = errors[0];
            throw new nango.ActionError({
                type: 'label_creation_error',
                message: firstError?.error_messages?.join(', ') || 'Label creation failed'
            });
        }

        if (labels === undefined || labels.length === 0) {
            throw new nango.ActionError({
                type: 'no_label_created',
                message: 'No label was created'
            });
        }

        const created = labels[0];

        if (created === undefined || created.id === undefined) {
            throw new nango.ActionError({
                type: 'no_label_created',
                message: 'No label was created'
            });
        }

        return {
            id: created.id,
            ...(created.label_type != null && { label_type: created.label_type }),
            ...(created.status != null && { status: created.status }),
            ...(created.value != null && { value: created.value })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
