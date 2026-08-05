import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_id: z.string().describe('Connected user ID. Example: "cmseows7p000fk604g3qee8bs"'),
    display: z.enum(['hosted', 'headless']).optional().describe('Display mode for the attachment flow. Defaults to "hosted".')
});

const ProviderCardSchema = z.object({
    network: z.string().nullable().optional(),
    brand: z.string().nullable().optional(),
    last4: z.string().nullable().optional(),
    art_url: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    object: z.string(),
    id: z.string(),
    user_id: z.string(),
    status: z.enum(['pending', 'active', 'ineligible']),
    attach_url: z.string().optional(),
    expires_at: z.string().optional(),
    card: ProviderCardSchema.optional(),
    reason: z.string().optional(),
    message: z.string().optional()
});

const OutputSchema = z.object({
    object: z.string(),
    id: z.string().describe('Attachment session ID. Example: "cmsep31u10026k6040sirus9l"'),
    user_id: z.string().describe('Connected user ID.'),
    status: z.string().describe('Attachment status. Examples: "pending", "active", "ineligible"'),
    attach_url: z.string().optional().describe('Hosted page URL to redirect the user to. Present when status is pending.'),
    expires_at: z.string().optional().describe('ISO 8601 timestamp when the session expires. Present when status is pending.'),
    card: z
        .object({
            network: z.string().optional(),
            brand: z.string().optional(),
            last4: z.string().optional(),
            art_url: z.string().optional()
        })
        .optional()
        .describe('Display details of the attached card. Present when status is active.'),
    reason: z.string().optional().describe('Why the card cannot be attached. Present when status is ineligible.'),
    message: z.string().optional().describe('Human-readable guidance. Present when status is ineligible.')
});

const action = createAction({
    description:
        "Start attaching a connected user's own existing Visa/Mastercard so their agent's purchases charge it directly (no KYC, no balance funding required).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.agentcard.sh/companies/api/reference/attach-start
            endpoint: '/api/v2/attach',
            data: {
                user_id: input.user_id,
                display: input.display ?? 'hosted'
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            object: providerResponse.object,
            id: providerResponse.id,
            user_id: providerResponse.user_id,
            status: providerResponse.status,
            ...(providerResponse.attach_url !== undefined && { attach_url: providerResponse.attach_url }),
            ...(providerResponse.expires_at !== undefined && { expires_at: providerResponse.expires_at }),
            ...(providerResponse.card !== undefined && {
                card: {
                    ...(providerResponse.card.network != null && { network: providerResponse.card.network }),
                    ...(providerResponse.card.brand != null && { brand: providerResponse.card.brand }),
                    ...(providerResponse.card.last4 != null && { last4: providerResponse.card.last4 }),
                    ...(providerResponse.card.art_url != null && { art_url: providerResponse.card.art_url })
                }
            }),
            ...(providerResponse.reason !== undefined && { reason: providerResponse.reason }),
            ...(providerResponse.message !== undefined && { message: providerResponse.message })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
