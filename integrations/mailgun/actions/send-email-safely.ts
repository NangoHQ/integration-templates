import { z } from 'zod';
import { createAction } from 'nango';
import type { NangoAction, ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        domain: z.string().describe('Mailgun domain whose suppression lists are checked and from which the message is sent. Example: "mg.example.com"'),
        from: z.string().describe('Sender address for the From header. Supports a friendly name. Example: "Alice <alice@mg.example.com>"'),
        to: z
            .string()
            .describe(
                'Recipient email address. This address is looked up on the domain\'s bounce, complaint, and unsubscribe suppression lists before any send is attempted. Example: "bob@example.com"'
            ),
        subject: z.string().describe('Subject line of the message'),
        text: z.string().describe('Plain-text body of the message')
    })
    .describe("Recipient, sender, and content for an email that is only sent after checking the recipient against the domain's suppression lists.");

const SuppressionDetailsSchema = z.object({
    address: z.string().describe('The suppressed email address. Example: "bob@example.com"'),
    created_at: z.string().optional().describe('When the suppression record was created, in RFC 2822 format. Example: "Mon, 26 Oct 2020 10:00:00 GMT"'),
    code: z.string().optional().describe('SMTP error code. Present on bounce records only. Example: "550"'),
    error: z.string().optional().describe('SMTP error message. Present on bounce records only'),
    tags: z.array(z.string()).optional().describe('Tags of the message the recipient unsubscribed from. Present on unsubscribe records only')
});

const SendErrorSchema = z.object({
    status: z.number().describe('HTTP status code returned by Mailgun for the rejected send. Example: 403'),
    message: z.string().describe('Error message returned by Mailgun for the rejected send')
});

const OutputSchema = z
    .object({
        sent: z.boolean().describe('True when Mailgun accepted the message and queued it for delivery'),
        suppressed: z.boolean().describe('True when the recipient was found on a suppression list, in which case no send was attempted'),
        reason: z
            .enum(['bounced', 'complained', 'unsubscribed'])
            .optional()
            .describe('Which suppression list the recipient was found on. Present only when suppressed is true'),
        details: SuppressionDetailsSchema.optional().describe('The suppression record that matched the recipient. Present only when suppressed is true'),
        message_id: z.string().optional().describe('Mailgun message ID. Present only when sent is true. Example: "<20201016000000.1.abcdef@mg.example.com>"'),
        message: z.string().optional().describe('Mailgun response message, e.g. "Queued. Thank you.". Present only when sent is true'),
        error: SendErrorSchema.optional().describe(
            'Provider error when the send was attempted but Mailgun rejected it. Present only when sent is false and suppressed is false'
        )
    })
    .describe('Outcome of the suppression check and, when the recipient is not suppressed, of the send attempt.');

const BounceRecordSchema = z.object({
    address: z.string(),
    code: z.union([z.string(), z.number()]).optional(),
    error: z.string().optional(),
    created_at: z.string().optional()
});

const ComplaintRecordSchema = z.object({
    address: z.string(),
    created_at: z.string()
});

const UnsubscribeRecordSchema = z.object({
    address: z.string(),
    tags: z.array(z.string()).optional(),
    created_at: z.string()
});

const SendMessageResponseSchema = z.object({
    id: z.string(),
    message: z.string()
});

const MailgunErrorBodySchema = z.object({
    message: z.string()
});

type SuppressionKind = 'bounces' | 'complaints' | 'unsubscribes';

interface ProviderHttpError {
    status: number;
    message: string;
}

function parseProviderHttpError(err: unknown): ProviderHttpError | null {
    if (typeof err !== 'object' || err === null || !('response' in err)) {
        return null;
    }
    const response: unknown = err.response;
    if (typeof response !== 'object' || response === null || !('status' in response) || typeof response.status !== 'number') {
        return null;
    }
    let message = 'Unknown provider error';
    if ('data' in response) {
        const parsed = MailgunErrorBodySchema.safeParse(response.data);
        if (parsed.success) {
            message = parsed.data.message;
        }
    }
    return { status: response.status, message };
}

async function fetchSuppressionRecord<T>(
    nango: NangoAction,
    kind: SuppressionKind,
    encodedDomain: string,
    encodedAddress: string,
    schema: z.ZodType<T>
): Promise<T | null> {
    const config: ProxyConfiguration = {
        // https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/bounces/get-v3--domainid--bounces--address-
        // https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/complaints/get-v3--domainid--complaints--address-
        // https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/unsubscribe/get-v3--domainid--unsubscribes--address-
        endpoint: `/v3/${encodedDomain}/${kind}/${encodedAddress}`,
        // Idempotent lookup read; 3 is the normal retry ceiling for GET calls.
        retries: 3
    };
    // @allowTryCatch: a 404 from a suppression lookup means the address is absent from that list, which is an expected outcome of this check rather than a failure. The live proxy throws on non-2xx responses while recorded test mocks resolve with the response status, so both paths are handled.
    try {
        const response = await nango.get(config);
        if (response.status === 404) {
            return null;
        }
        if (response.status >= 400) {
            throw new Error(`Mailgun ${kind} lookup failed with status ${response.status}`);
        }
        return schema.parse(response.data);
    } catch (err) {
        const providerError = parseProviderHttpError(err);
        if (providerError && providerError.status === 404) {
            return null;
        }
        throw err;
    }
}

/**
 * @tags: [read, write]
 * @tagReason: Reads the domain's bounce, complaint, and unsubscribe suppression lists for the recipient, then writes by sending (queuing) an email message when the recipient is not suppressed.
 * @pitfalls: sent=true means Mailgun accepted and queued the message, not that it was delivered. Suppression checks are domain-scoped, so the same recipient can be suppressed on one domain and clear on another. Sandbox domains reject all API sends to recipients not on the account's authorized-recipients list (managed in the Mailgun dashboard); such rejections come back as sent=false with an error, not as suppressed.
 */
const action = createAction({
    description:
        "Checks a recipient against the domain's bounce, complaint, and unsubscribe suppression lists and only sends the message if the address is not suppressed.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const encodedDomain = encodeURIComponent(input.domain);
        const encodedAddress = encodeURIComponent(input.to);

        const bounce = await fetchSuppressionRecord(nango, 'bounces', encodedDomain, encodedAddress, BounceRecordSchema);
        if (bounce) {
            return {
                sent: false,
                suppressed: true,
                reason: 'bounced',
                details: {
                    address: bounce.address,
                    ...(bounce.created_at !== undefined && { created_at: bounce.created_at }),
                    ...(bounce.code !== undefined && { code: String(bounce.code) }),
                    ...(bounce.error !== undefined && { error: bounce.error })
                }
            };
        }

        const complaint = await fetchSuppressionRecord(nango, 'complaints', encodedDomain, encodedAddress, ComplaintRecordSchema);
        if (complaint) {
            return {
                sent: false,
                suppressed: true,
                reason: 'complained',
                details: {
                    address: complaint.address,
                    created_at: complaint.created_at
                }
            };
        }

        const unsubscribe = await fetchSuppressionRecord(nango, 'unsubscribes', encodedDomain, encodedAddress, UnsubscribeRecordSchema);
        if (unsubscribe) {
            return {
                sent: false,
                suppressed: true,
                reason: 'unsubscribed',
                details: {
                    address: unsubscribe.address,
                    created_at: unsubscribe.created_at,
                    ...(unsubscribe.tags !== undefined && { tags: unsubscribe.tags })
                }
            };
        }

        const sendConfig: ProxyConfiguration = {
            // https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/messages/post-v3--domain-name--messages
            endpoint: `/v3/${encodedDomain}/messages`,
            // Mailgun accepts these fields as query parameters, which avoids the proxy body-serialization issue with form-encoded POST bodies.
            params: {
                from: input.from,
                to: input.to,
                subject: input.subject,
                text: input.text
            },
            // Sending is not idempotent: this endpoint has no idempotency key, so a retry after a lost response could deliver a duplicate email.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        };

        // @allowTryCatch: a provider-side rejection of the send (for example Mailgun's sandbox-domain sending restriction) is an expected outcome that this composite returns as a structured result instead of throwing, so callers can distinguish it from a suppression block. The live proxy throws on non-2xx responses while recorded test mocks resolve with the response status, so both paths are handled.
        try {
            const response = await nango.post(sendConfig);
            if (response.status >= 400) {
                const parsedError = MailgunErrorBodySchema.safeParse(response.data);
                return {
                    sent: false,
                    suppressed: false,
                    error: {
                        status: response.status,
                        message: parsedError.success ? parsedError.data.message : 'Unknown provider error'
                    }
                };
            }
            const sent = SendMessageResponseSchema.parse(response.data);
            return {
                sent: true,
                suppressed: false,
                message_id: sent.id,
                message: sent.message
            };
        } catch (err) {
            const providerError = parseProviderHttpError(err);
            if (!providerError) {
                throw err;
            }
            return {
                sent: false,
                suppressed: false,
                error: providerError
            };
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
