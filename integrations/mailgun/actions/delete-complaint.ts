import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        domain: z.string().describe('Mailgun domain whose spam-complaint suppression list is modified. Example: "sandbox123abc.mailgun.org"'),
        address: z.string().describe('Email address to remove from the spam-complaint suppression list. Example: "user@example.com"')
    })
    .describe("Input for removing an address from a domain's spam-complaint suppression list");

const DeleteComplaintResponseSchema = z.object({
    address: z.string(),
    message: z.string()
});

const OutputSchema = z
    .object({
        address: z.string().describe('Email address that was removed from the spam-complaint suppression list'),
        message: z.string().describe('Confirmation message returned by Mailgun')
    })
    .describe('Confirmation that the address was removed from the spam-complaint suppression list');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes an address from the domain's spam-complaint suppression list on the provider.
 * @pitfalls: Delivery to the removed address resumes until the recipient complains again, undoing the protection the suppression provided; removing an address that is not on the complaints list fails with a 404 error.
 */
const action = createAction({
    description: "Remove an address from a domain's spam-complaint suppression list",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/complaints/delete-v3--domainid--complaints--address-
        const response = await nango.delete({
            endpoint: `/v3/${encodeURIComponent(input.domain)}/complaints/${encodeURIComponent(input.address)}`,
            // Not idempotent: retrying after a lost-but-successful delete would 404 and mask the original success.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const parsed = DeleteComplaintResponseSchema.parse(response.data);

        return {
            address: parsed.address,
            message: parsed.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
