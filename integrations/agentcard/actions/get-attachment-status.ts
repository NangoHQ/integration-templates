import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_id: z.string().describe('Connected user ID. Example: "cmsf6au26004ijl04v86y15yk"')
});

const ProviderCardSchema = z.object({
    network: z.string().nullable().optional(),
    brand: z.string().nullable().optional(),
    last4: z.string().nullable().optional(),
    art_url: z.string().nullable().optional()
});

const ProviderAttachmentSchema = z.object({
    object: z.string(),
    id: z.string(),
    user_id: z.string(),
    status: z.string(),
    attach_url: z.string().optional(),
    expires_at: z.string().optional(),
    card: ProviderCardSchema.optional(),
    reason: z.string().optional(),
    message: z.string().optional()
});

const OutputSchema = z.object({
    object: z.string(),
    id: z.string(),
    user_id: z.string(),
    status: z.string(),
    attach_url: z.string().optional(),
    expires_at: z.string().optional(),
    card: z
        .object({
            network: z.string().optional(),
            brand: z.string().optional(),
            last4: z.string().optional(),
            art_url: z.string().optional()
        })
        .optional(),
    reason: z.string().optional(),
    message: z.string().optional()
});

const action = createAction({
    description: "Poll a connected user's card attachment status.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.agentcard.sh/companies/api/reference/attach-status
            endpoint: '/api/v2/attach',
            params: {
                user_id: input.user_id
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Attachment status not found for user',
                user_id: input.user_id
            });
        }

        const providerAttachment = ProviderAttachmentSchema.parse(response.data);

        return {
            object: providerAttachment.object,
            id: providerAttachment.id,
            user_id: providerAttachment.user_id,
            status: providerAttachment.status,
            ...(providerAttachment.attach_url !== undefined && { attach_url: providerAttachment.attach_url }),
            ...(providerAttachment.expires_at !== undefined && { expires_at: providerAttachment.expires_at }),
            ...(providerAttachment.card !== undefined && {
                card: {
                    ...(providerAttachment.card.network != null && { network: providerAttachment.card.network }),
                    ...(providerAttachment.card.brand != null && { brand: providerAttachment.card.brand }),
                    ...(providerAttachment.card.last4 != null && { last4: providerAttachment.card.last4 }),
                    ...(providerAttachment.card.art_url != null && { art_url: providerAttachment.card.art_url })
                }
            }),
            ...(providerAttachment.reason !== undefined && { reason: providerAttachment.reason }),
            ...(providerAttachment.message !== undefined && { message: providerAttachment.message })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
