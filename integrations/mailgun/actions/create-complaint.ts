import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        domain: z.string().describe('Mailgun domain that owns the spam-complaint suppression list. Example: "mg.example.com"'),
        address: z.string().describe('Email address to add to the spam-complaint suppression list. Example: "user@example.com"')
    })
    .describe("Input for manually adding an address to a domain's spam-complaint suppression list");

const OutputSchema = z
    .object({
        address: z.string().describe('Email address that was added to the spam-complaint suppression list'),
        message: z.string().describe('Confirmation message returned by Mailgun. Example: "Address has been added to the complaints table"')
    })
    .describe("Result of adding an address to a domain's spam-complaint suppression list");

const ProviderComplaintSchema = z.object({
    address: z.string(),
    message: z.string()
});

/**
 * @tags: [write]
 * @tagReason: Adds an address to a Mailgun domain's spam-complaint suppression list, a provider-side mutation.
 * @pitfalls: While an address is on the complaints list, Mailgun suppresses all future delivery to it for that domain until the complaint is removed; re-adding an address that is already listed succeeds again rather than returning an error.
 */
const action = createAction({
    description: "Manually add an address to a domain's spam-complaint suppression list",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/complaints/post-v3--domainid--complaints
        // Params go in the query string (Mailgun's v3 API requires form-encoded params, and the Nango proxy
        // mis-serializes plain JS object bodies as JSON). The form Content-Type header is forwarded to Mailgun
        // and prevents the proxy from sending the empty body as JSON, which Mailgun rejects with "Invalid JSON".
        const response = await nango.post({
            endpoint: `/v3/${encodeURIComponent(input.domain)}/complaints`,
            params: {
                address: input.address
            },
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- create-style POST with no idempotency key; a retry after a lost response would repeat the mutation
            retries: 0
        });

        const complaint = ProviderComplaintSchema.parse(response.data);

        return {
            address: complaint.address,
            message: complaint.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
