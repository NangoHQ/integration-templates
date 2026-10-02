import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        dealId: z
            .string()
            .describe(
                'ID of the deal to link or unlink contacts and companies on. Deals use 24-character hexadecimal string IDs. Example: "61a5ce58c5d4795761045990"'
            ),
        linkContactIds: z.array(z.number().int()).optional().describe('Numeric contact IDs to link to the deal. Example: [1, 2]'),
        unlinkContactIds: z.array(z.number().int()).optional().describe('Numeric contact IDs to unlink from the deal. Example: [3]'),
        linkCompanyIds: z
            .array(z.string())
            .optional()
            .describe('Company IDs to link to the deal. Companies use 24-character hexadecimal string IDs. Example: ["61a5ce58c5d4795761045990"]'),
        unlinkCompanyIds: z.array(z.string()).optional().describe('Company IDs to unlink from the deal. Example: ["61a5ce58c5d4795761045991"]')
    })
    .describe('Deal link/unlink request. Provide the deal ID plus at least one non-empty link or unlink ID array.');

const OutputSchema = z
    .object({
        id: z.string().describe('ID of the deal whose relations were updated'),
        linkedContactsIds: z.array(z.number()).describe('Numeric IDs of all contacts currently linked to the deal after the update'),
        linkedCompaniesIds: z.array(z.string()).describe('IDs of all companies currently linked to the deal after the update')
    })
    .describe('Resulting deal relations after the link/unlink was applied, read back from the deal.');

const DealResponseSchema = z.object({
    id: z.string().optional(),
    linkedContactsIds: z.array(z.number()).optional(),
    linkedCompaniesIds: z.array(z.string()).optional()
});

/**
 * @tags: [read, write]
 * @tagReason: Mutates the deal's linked contacts/companies with a PATCH (write), then reads the deal back with a GET to return its resulting relations (read).
 * @pitfalls: Linking is additive, not a full replacement of the deal's relations: contacts and companies already linked to the deal stay linked unless their IDs are explicitly passed in unlinkContactIds or unlinkCompanyIds.
 */
const action = createAction({
    description: 'Link or unlink contacts and/or companies to a deal.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const hasOperation = [input.linkContactIds, input.unlinkContactIds, input.linkCompanyIds, input.unlinkCompanyIds].some(
            (ids) => ids !== undefined && ids.length > 0
        );

        if (!hasOperation) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Provide at least one non-empty array among linkContactIds, unlinkContactIds, linkCompanyIds, and unlinkCompanyIds.'
            });
        }

        const dealId = encodeURIComponent(input.dealId);

        const patchConfig: ProxyConfiguration = {
            // Link/unlink converges to the same state when replayed (already-linked IDs stay linked, already-unlinked stay unlinked), so retries are safe here.
            // https://developers.brevo.com/reference/link-and-unlink-a-deal-with-contacts-and-companies
            endpoint: `/crm/deals/link-unlink/${dealId}`,
            data: {
                ...(input.linkContactIds !== undefined && { linkContactIds: input.linkContactIds }),
                ...(input.unlinkContactIds !== undefined && { unlinkContactIds: input.unlinkContactIds }),
                ...(input.linkCompanyIds !== undefined && { linkCompanyIds: input.linkCompanyIds }),
                ...(input.unlinkCompanyIds !== undefined && { unlinkCompanyIds: input.unlinkCompanyIds })
            },
            retries: 3
        };
        await nango.patch(patchConfig);

        const getConfig: ProxyConfiguration = {
            // https://developers.brevo.com/reference/get-a-deal
            endpoint: `/crm/deals/${dealId}`,
            retries: 3
        };
        const response = await nango.get(getConfig);

        const deal = DealResponseSchema.parse(response.data);

        return {
            id: deal.id ?? input.dealId,
            linkedContactsIds: deal.linkedContactsIds ?? [],
            linkedCompaniesIds: deal.linkedCompaniesIds ?? []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
