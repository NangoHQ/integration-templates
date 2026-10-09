import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        record_id: z.string().describe('Unique ID of the account to update. Example: "7618134000000632027".'),
        Account_Name: z.string().optional().describe('New company name for the account.'),
        Phone: z.string().nullable().optional().describe('New phone number. Set to null to clear the current value.'),
        Website: z.string().nullable().optional().describe('New website URL. Set to null to clear the current value.'),
        Billing_Street: z.string().nullable().optional().describe('Billing street address. Set to null to clear the current value.'),
        Billing_City: z.string().nullable().optional().describe('Billing city. Set to null to clear the current value.'),
        Billing_State: z.string().nullable().optional().describe('Billing state or province. Set to null to clear the current value.'),
        Billing_Code: z.string().nullable().optional().describe('Billing postal code. Set to null to clear the current value.'),
        Billing_Country: z.string().nullable().optional().describe('Billing country. Set to null to clear the current value.'),
        Description: z.string().nullable().optional().describe('Free-text description of the account. Set to null to clear the current value.'),
        Tag: z
            .array(
                z.object({
                    name: z.string().describe('Tag name to apply to the account.')
                })
            )
            .optional()
            .describe('Full set of tags to set on the account, replacing any existing tags.')
    })
    .describe('Fields to change on an existing Zoho Bigin account; omitted fields keep their current value.');

const ProviderUpdateResponseSchema = z.object({
    data: z.array(
        z.object({
            status: z.string().optional(),
            message: z.string().optional(),
            details: z
                .object({
                    id: z.string(),
                    Modified_Time: z.string().optional()
                })
                .passthrough()
                .optional()
        })
    )
});

const OutputSchema = z
    .object({
        id: z.string().describe('ID of the updated account.'),
        status: z.string().describe('Provider status of the update, e.g. "success".'),
        message: z.string().describe('Provider message describing the result, e.g. "record updated".'),
        Modified_Time: z.string().optional().describe('ISO 8601 timestamp when the account was last modified.')
    })
    .describe('Confirmation of the account update returned by Zoho Bigin.');

/**
 * @tags: [write]
 * @tagReason: Updates an existing Account's fields on the provider; only the supplied fields are changed.
 * @pitfalls: Omitted fields are left unchanged, but explicitly sending null clears a field; renaming to a name already used by another account is rejected as a duplicate, and updating a non-existent account fails.
 */
const action = createAction({
    description: 'Update an account (company) in Zoho Bigin.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload = {
            id: input.record_id,
            ...(input.Account_Name !== undefined && { Account_Name: input.Account_Name }),
            ...(input.Phone !== undefined && { Phone: input.Phone }),
            ...(input.Website !== undefined && { Website: input.Website }),
            ...(input.Billing_Street !== undefined && { Billing_Street: input.Billing_Street }),
            ...(input.Billing_City !== undefined && { Billing_City: input.Billing_City }),
            ...(input.Billing_State !== undefined && { Billing_State: input.Billing_State }),
            ...(input.Billing_Code !== undefined && { Billing_Code: input.Billing_Code }),
            ...(input.Billing_Country !== undefined && { Billing_Country: input.Billing_Country }),
            ...(input.Description !== undefined && { Description: input.Description }),
            ...(input.Tag !== undefined && { Tag: input.Tag })
        };

        // https://www.bigin.com/developer/docs/apis/v2/update-records.html
        const response = await nango.put<unknown>({
            endpoint: `/bigin/v2/Accounts/${encodeURIComponent(input.record_id)}`,
            data: { data: [payload] },
            retries: 3
        });

        const parsed = ProviderUpdateResponseSchema.parse(response.data);
        const record = parsed.data[0];

        if (!record || !record.details) {
            throw new nango.ActionError({
                type: 'update_failed',
                message: 'The provider did not confirm the account update.',
                record_id: input.record_id
            });
        }

        return {
            id: record.details.id,
            status: record.status ?? 'success',
            message: record.message ?? 'record updated',
            ...(record.details.Modified_Time !== undefined && { Modified_Time: record.details.Modified_Time })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
