import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        name: z.string().describe('Name of the deal. Example: "Deal: Connect with company"'),
        attributes: z
            .record(z.string(), z.unknown())
            .optional()
            .describe(
                'Custom deal attributes as key/value pairs (for example deal_owner with an account email or ID). Note: pipeline and deal_stage cannot be set here on accounts without configured deal pipelines; new deals are placed in the default pipeline and first stage.'
            ),
        linkedCompaniesIds: z
            .array(z.string())
            .optional()
            .describe('Company ids to link to the deal. Company ids are 24-character hex strings. Example: ["61a5cd07ca1347c82306ad06"]'),
        linkedContactsIds: z.array(z.number().int()).optional().describe('Numeric contact ids to link to the deal. Example: [1, 2]')
    })
    .describe('Deal to create');

const ProviderCreateDealResponseSchema = z.object({
    id: z.string()
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique id of the created deal (24-character hex string). Example: "61a5cd07ca1347c82306ad06"')
    })
    .describe('The created deal');

/**
 * @tags: [write]
 * @tagReason: Creates a new deal in the provider CRM; no provider reads or deletions are performed.
 * @pitfalls: New deals are always placed in the account's default pipeline and first stage; passing pipeline/deal_stage in attributes is rejected with a 400 on accounts without configured deal pipelines.
 */
const action = createAction({
    description: 'Create a new deal.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.brevo.com/reference/post_crm-deals
        const response = await nango.post({
            endpoint: '/crm/deals',
            data: {
                name: input.name,
                ...(input.attributes !== undefined && { attributes: input.attributes }),
                ...(input.linkedCompaniesIds !== undefined && { linkedCompaniesIds: input.linkedCompaniesIds }),
                ...(input.linkedContactsIds !== undefined && { linkedContactsIds: input.linkedContactsIds })
            },
            // retries: 0 — creating a deal is not idempotent; Brevo has no idempotency key, so a retry after a lost response would create a duplicate deal
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const createdDeal = ProviderCreateDealResponseSchema.parse(response.data);

        return {
            id: createdDeal.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
