import { z } from 'zod';
import { createTool, type HttpResponse } from 'nango';

// Validates exactly like z.email(); used through z.stringFormat() so the compiled JSON Schema carries only format: "email".
const emailFormatSchema = z.email();

const InputSchema = z
    .object({
        userId: z.string().min(1).describe('Target Datadog user ID; self or on_call_admin authority is required.'),
        channel: z
            .union([
                z.object({
                    type: z.literal('phone').describe('Creates a personal phone contact channel.'),
                    number: z
                        .string()
                        .regex(/^\+[1-9][0-9]{1,14}$/)
                        .describe('Phone number in E.164 form, including the leading plus sign.')
                }),
                z.object({
                    type: z.literal('email').describe('Creates a personal email contact channel.'),
                    address: z
                        .stringFormat('email', (value) => emailFormatSchema.safeParse(value).success)
                        .describe('Email address to receive On-Call alerts.'),
                    formats: z.array(z.enum(['html', 'text'])).describe('Requested email content formats; sent exactly, including [] if supplied.')
                })
            ])
            .describe('Typed personal contact details; push channel registration is not supported by this tool.')
    })
    .describe('Target user and the personal phone or email contact channel to register for Datadog On-Call alerts.');

const OutputSchema = z
    .object({
        id: z.string().describe('ID of the created notification channel.'),
        active: z.boolean().optional().describe('Whether Datadog reports the channel active; omitted if not returned.'),
        userId: z.string().describe('User ID owning the channel.'),
        verified: z.boolean().optional().describe('Phone verification state when returned; omission does not mean verified.')
    })
    .describe('The created notification channel, its owning user, and the channel state Datadog returned.');

const ProviderResponseSchema = z.object({
    data: z
        .object({
            id: z.string().optional(),
            attributes: z
                .object({
                    active: z.boolean().optional(),
                    config: z
                        .object({
                            verified: z.boolean().optional()
                        })
                        .optional()
                })
                .optional()
        })
        .optional()
});

const HttpErrorSchema = z.looseObject({
    response: z
        .looseObject({
            status: z.number().optional()
        })
        .optional(),
    request: z.unknown().optional()
});

/**
 * @tags: [write]
 * @tagReason: Creates a notification channel in Datadog with a single POST; it performs no provider reads and has no destructive effect.
 * @pitfalls: The authenticated user must be the target user or hold the on_call_admin permission. A created phone channel is not verified by this call, so alerts may not reach it until the user verifies it in Datadog. A failed call may still have created the channel, so list existing channels before invoking this tool again.
 */
const tool = createTool({
    name: 'create-on-call-notification-channel',
    description:
        "Create a user's email or phone contact channel for On-Call alerts. The authenticated user must be that user or have on_call_admin permission.",
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            'Use to add a personal email or phone contact method, not to register a webhook, listener or push subscription. Know the target user ID first. Use `list-on-call-notification-channels` to check existing channels. Creation does not assert that a phone is verified or that alerts can already be delivered.',
        requiredScopes: [],
        tags: { read_only_hint: 'false', destructive_hint: 'false', idempotent_hint: 'false' }
    },

    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;

        let response: HttpResponse<unknown>;
        // @allowTryCatch: map Datadog HTTP error statuses to the tool's public error codes; unmapped errors are rethrown unchanged.
        try {
            // https://docs.datadoghq.com/api/latest/on-call/#create-an-on-call-notification-channel-for-a-user
            response = await nango.post<unknown>({
                endpoint: `/v2/on-call/users/${encodeURIComponent(input.userId)}/notification-channels`,
                data: {
                    data: {
                        type: 'notification_channels',
                        attributes: {
                            config: input.channel
                        }
                    }
                },
                retries: 3
            });
        } catch (error) {
            const parsedError = HttpErrorSchema.safeParse(error);
            const status = parsedError.success ? parsedError.data.response?.status : undefined;
            const requestSent = parsedError.success ? parsedError.data.request !== undefined : false;

            if (status === 400) {
                throw new Error(
                    'invalid_configuration: Datadog rejected the contact details or channel settings. Correct the address, number or formats; inspect existing channels for duplicates.'
                );
            }
            if (status === 403) {
                throw new Error(
                    "permission_denied: Caller is neither the target user nor authorized with on_call_admin. Use the target user's connection or ask an On-Call administrator."
                );
            }
            if (status === 404) {
                throw new Error('not_found: Target user is unavailable. Verify the user ID.');
            }
            if (status === 429) {
                throw new Error('rate_limited: Datadog reported too many requests. Wait and list channels before repeating an ambiguous creation.');
            }
            if (status === undefined && requestSent) {
                throw new Error(
                    'write_result_unknown: The channel may have been created but its ID cannot be established. Use `list-on-call-notification-channels` before trying again.'
                );
            }
            throw error;
        }

        const created = ProviderResponseSchema.parse(response.data);
        const id = created.data?.id;
        if (!id) {
            throw new Error(
                'write_result_unknown: The channel may have been created but its ID cannot be established. Use `list-on-call-notification-channels` before trying again.'
            );
        }

        const active = created.data?.attributes?.active;
        const verified = created.data?.attributes?.config?.verified;

        return {
            id,
            ...(active !== undefined && { active }),
            userId: input.userId,
            ...(verified !== undefined && { verified })
        };
    }
});

export default tool;
