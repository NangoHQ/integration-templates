import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        record_id: z.string().describe('Unique ID of the product to update. Example: "7618134000000647002".'),
        Product_Name: z.string().optional().describe('New name of the product. Product names are mandatory and cannot be cleared.'),
        Product_Code: z.string().nullable().optional().describe('New product code. Set to null to clear the existing code.'),
        Unit_Price: z.number().nullable().optional().describe('New unit price. Set to null to clear the existing price.'),
        Product_Category: z.string().nullable().optional().describe('New product category value. Set to null to clear the existing category.'),
        Description: z.string().nullable().optional().describe('New product description. Set to null to clear the existing description.'),
        Product_Active: z.boolean().optional().describe('Whether the product is active.'),
        Tag: z
            .array(
                z.object({
                    name: z.string().describe('Name of a tag to apply to the product.')
                })
            )
            .optional()
            .describe('Replacement list of tags for the product. Pass an empty array to remove every existing tag.'),
        Owner: z
            .object({
                id: z.string().describe('ID of the user to set as the product owner.')
            })
            .optional()
            .describe('New owner of the product.')
    })
    .describe('Input for updating an existing Bigin product: the product ID plus only the fields to change.');

const ProviderUserSchema = z.object({
    id: z.string().nullable().optional(),
    name: z.string().nullable().optional()
});

const ProviderRecordDetailsSchema = z.object({
    id: z.string().nullable().optional(),
    Modified_Time: z.string().nullable().optional(),
    Modified_By: ProviderUserSchema.nullable().optional()
});

const ProviderUpdateResultSchema = z.object({
    code: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    message: z.string().nullable().optional(),
    details: ProviderRecordDetailsSchema.nullable().optional()
});

const ProviderUpdateResponseSchema = z.object({
    data: z.array(ProviderUpdateResultSchema).optional()
});

const OutputSchema = z
    .object({
        record_id: z.string().describe('Unique ID of the updated product.'),
        code: z.string().optional().describe('Provider status code for the update, for example "SUCCESS".'),
        status: z.string().optional().describe('Provider status for the update, for example "success".'),
        message: z.string().optional().describe('Provider confirmation message, for example "record updated".'),
        modified_time: z.string().optional().describe('ISO 8601 timestamp of when the product was last modified, in the provider organization timezone.'),
        modified_by: z
            .object({
                id: z.string().describe('ID of the user who last modified the product.'),
                name: z.string().optional().describe('Name of the user who last modified the product.')
            })
            .optional()
            .describe('User who last modified the product.')
    })
    .describe('Result of updating a Bigin product, including the updated product ID and provider confirmation metadata.');

/**
 * @tags: [write]
 * @tagReason: Updates fields on an existing product through the provider's record update endpoint. It performs no reads and does not delete or revoke anything.
 * @pitfalls: Despite using PUT, this is a partial merge: only the fields you send change and all others stay as-is; pass null to clear a clearable field (Product_Name cannot be cleared). Updates execute org-configured workflows and approvals because no trigger is suppressed.
 */
const action = createAction({
    description: 'Update a product in Bigin. Only the fields provided are changed.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put<unknown>({
            // https://www.bigin.com/developer/docs/apis/v2/update-records.html
            endpoint: `/bigin/v2/Products/${encodeURIComponent(input.record_id)}`,
            data: {
                data: [
                    {
                        id: input.record_id,
                        ...(input.Product_Name !== undefined && { Product_Name: input.Product_Name }),
                        ...(input.Product_Code !== undefined && { Product_Code: input.Product_Code }),
                        ...(input.Unit_Price !== undefined && { Unit_Price: input.Unit_Price }),
                        ...(input.Product_Category !== undefined && { Product_Category: input.Product_Category }),
                        ...(input.Description !== undefined && { Description: input.Description }),
                        ...(input.Product_Active !== undefined && { Product_Active: input.Product_Active }),
                        ...(input.Tag !== undefined && { Tag: input.Tag }),
                        ...(input.Owner !== undefined && { Owner: input.Owner })
                    }
                ]
            },
            // PUT is idempotent here: a retry merges the same field values, so a safe retry limit is fine.
            retries: 3
        });

        const parsed = ProviderUpdateResponseSchema.parse(response.data);
        const item = parsed.data?.[0];

        if (!item || item.code !== 'SUCCESS') {
            throw new nango.ActionError({
                type: 'update_failed',
                message: item?.message ?? 'Product update failed',
                record_id: input.record_id
            });
        }

        const details = item.details;
        const modifiedBy = details?.Modified_By;

        return {
            record_id: details?.id ?? input.record_id,
            code: item.code,
            ...(item.status != null && { status: item.status }),
            ...(item.message != null && { message: item.message }),
            ...(details?.Modified_Time != null && { modified_time: details.Modified_Time }),
            ...(modifiedBy?.id != null && {
                modified_by: {
                    id: modifiedBy.id,
                    ...(modifiedBy.name != null && { name: modifiedBy.name })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
