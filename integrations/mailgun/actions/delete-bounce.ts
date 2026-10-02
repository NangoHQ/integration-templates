import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        domain: z.string().describe('The Mailgun domain whose bounce suppression list to modify. Example: "mg.example.com".'),
        address: z.string().describe('Email address to remove from the bounce suppression list. Example: "user@example.com".')
    })
    .describe('Domain and address identifying the bounce suppression entry to delete.');

const DeleteBounceResponseSchema = z.object({
    address: z.string(),
    message: z.string()
});

const OutputSchema = z
    .object({
        address: z.string().describe('The email address that was removed from the bounce suppression list.'),
        message: z.string().describe('Confirmation message returned by Mailgun, e.g. "Bounced address has been removed".')
    })
    .describe("Confirmation that the address was removed from the domain's bounce suppression list.");

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes a bounce suppression entry from the domain, permanently discarding the stored bounce record.
 * @pitfalls: Deleting a bounce re-enables delivery attempts to that address, which will be sent to again until it bounces again. Deleting an address that is not on the bounce list fails with a not-found error instead of succeeding silently.
 */
const action = createAction({
    description: "Remove an address from a domain's bounce suppression list.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/bounces/delete-v3--domainid--bounces--address-
        const response = await nango.delete({
            endpoint: `/v3/${encodeURIComponent(input.domain)}/bounces/${encodeURIComponent(input.address)}`,
            // Not idempotent: retrying after a lost-but-successful delete would 404 and mask the original success,
            // and could even remove a new bounce record re-created for the address in the meantime.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const parsed = DeleteBounceResponseSchema.parse(response.data);

        return {
            address: parsed.address,
            message: parsed.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
