import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        contact_id: z.string().describe('ID of the contact to link the product to. Example: "7618134000000632028"'),
        product_id: z.string().describe('ID of the product to link to the contact. Example: "7618134000000647020"')
    })
    .describe('Identifiers of the existing contact and product to associate.');

const ProviderLinkResultSchema = z.object({
    code: z.string(),
    details: z.object({
        id: z.string()
    }),
    message: z.string(),
    status: z.string()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderLinkResultSchema)
});

const OutputSchema = z
    .object({
        product_id: z.string().describe('ID of the product that was linked to the contact.'),
        code: z.string().describe('Provider result code for the link operation. Example: "SUCCESS"'),
        message: z.string().describe('Provider message describing the outcome. Example: "relation added"'),
        status: z.string().describe('Provider status for the link operation. Example: "success"')
    })
    .describe('Confirmation that the product was associated with the contact.');

/**
 * @tags: [write]
 * @tagReason: Creates a provider-side association between an existing contact and an existing product.
 * @pitfalls: Re-linking an existing association is idempotent but changes the reported message from added to updated; invalid IDs are not reported as not-found (an unknown contact yields a server error, an unknown product a bad-request error).
 */
const action = createAction({
    description: 'Associate an existing product with an existing contact.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBigin.modules.contacts.ALL', 'ZohoBigin.modules.products.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://www.bigin.com/developer/docs/apis/v2/update-related-records.html
            endpoint: `/bigin/v2/Contacts/${encodeURIComponent(input.contact_id)}/Products/${encodeURIComponent(input.product_id)}`,
            data: {
                data: [{}]
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const [result] = parsed.data;

        if (!result) {
            throw new nango.ActionError({
                type: 'link_failed',
                message: 'The provider did not confirm the product-contact association.',
                contact_id: input.contact_id,
                product_id: input.product_id
            });
        }

        return {
            product_id: result.details.id,
            code: result.code,
            message: result.message,
            status: result.status
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
