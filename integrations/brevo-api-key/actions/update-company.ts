import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.string().describe('Unique ID of the company to update (24-character hex string). Example: "629475917295261d9b1f4403".'),
        attributes: z
            .record(z.string(), z.unknown())
            .describe(
                'Company attributes to set, applied as a partial merge: only the provided keys are changed, all other attributes are left untouched. Example: { "industry": "technology", "revenue": 1000000 }.'
            )
    })
    .describe('Company update payload: the company ID plus the attribute keys to change.');

const OutputSchema = z
    .object({
        id: z.string().describe('Unique company ID (24-character hex string). Example: "629475917295261d9b1f4403".'),
        attributes: z.record(z.string(), z.unknown()).optional().describe('All company attributes with their current values after the update.'),
        linkedContactsIds: z.array(z.number()).optional().describe('IDs of the contacts linked to this company. Example: [1, 2, 3].'),
        linkedDealsIds: z
            .array(z.string())
            .optional()
            .describe('IDs of the deals linked to this company (24-character hex strings). Example: ["61a5ce58c5d4795761045990"].')
    })
    .describe('The company as it stands after the attribute update.');

const CompanySchema = z.object({
    id: z.string(),
    attributes: z.record(z.string(), z.unknown()).optional(),
    linkedContactsIds: z.array(z.number()).optional(),
    linkedDealsIds: z.array(z.string()).optional()
});

/**
 * @tags: [read, write]
 * @tagReason: Writes new attribute values to the company at the provider, then reads the updated company back.
 */
const action = createAction({
    description: "Update a company's attributes.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // PATCHing absolute attribute values is idempotent: re-sending the same partial merge after a lost response leaves the company in the same state.
        // https://developers.brevo.com/reference/patch_companies-id
        await nango.patch({
            endpoint: `/companies/${encodeURIComponent(input.id)}`,
            data: {
                attributes: input.attributes
            },
            retries: 3
        });

        // The PATCH above returns no body (204 No Content), so read the company back to return its post-update state.
        // https://developers.brevo.com/reference/get_companies-id
        const response = await nango.get({
            endpoint: `/companies/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        const company = CompanySchema.parse(response.data);

        return {
            id: company.id,
            ...(company.attributes !== undefined && { attributes: company.attributes }),
            ...(company.linkedContactsIds !== undefined && { linkedContactsIds: company.linkedContactsIds }),
            ...(company.linkedDealsIds !== undefined && { linkedDealsIds: company.linkedDealsIds })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
