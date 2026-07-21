import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The unique Mandrill message ID. Example: "abc123"')
});

const ProviderContentSchema = z.object({
    _id: z.string(),
    attachments: z
        .array(
            z.object({
                content: z.string(),
                name: z.string(),
                type: z.string()
            })
        )
        .optional(),
    from_email: z.string().optional(),
    from_name: z.string().optional(),
    headers: z.record(z.string(), z.string()).optional(),
    html: z.string().optional(),
    subject: z.string().optional(),
    tags: z.array(z.string()).optional(),
    text: z.string().optional(),
    to: z
        .object({
            email: z.string(),
            name: z.string().optional()
        })
        .optional(),
    ts: z.number().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    attachments: z
        .array(
            z.object({
                content: z.string(),
                name: z.string(),
                type: z.string()
            })
        )
        .optional(),
    from_email: z.string().optional(),
    from_name: z.string().optional(),
    headers: z.record(z.string(), z.string()).optional(),
    html: z.string().optional(),
    subject: z.string().optional(),
    tags: z.array(z.string()).optional(),
    text: z.string().optional(),
    to: z
        .object({
            email: z.string(),
            name: z.string().optional()
        })
        .optional(),
    ts: z.number().optional()
});

const MandrillErrorSchema = z.object({
    response: z.object({
        data: z.object({
            status: z.string(),
            code: z.number(),
            name: z.string(),
            message: z.string()
        })
    })
});

const action = createAction({
    description: 'Get the full content (headers, html, text) of a single recently sent message.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // @allowTryCatch Mandrill returns 404 with a JSON body for unknown messages; we map it to a descriptive ActionError.
        try {
            // https://mailchimp.com/developer/transactional/api/messages/content-json/
            const response = await nango.post({
                endpoint: '/messages/content.json',
                data: {
                    id: input.id
                },
                retries: 3,
                baseUrlOverride: 'https://mandrillapp.com/api/1.0/'
            });

            const providerContent = ProviderContentSchema.parse(response.data);

            return {
                id: providerContent._id,
                ...(providerContent.attachments !== undefined && { attachments: providerContent.attachments }),
                ...(providerContent.from_email !== undefined && { from_email: providerContent.from_email }),
                ...(providerContent.from_name !== undefined && { from_name: providerContent.from_name }),
                ...(providerContent.headers !== undefined && { headers: providerContent.headers }),
                ...(providerContent.html !== undefined && { html: providerContent.html }),
                ...(providerContent.subject !== undefined && { subject: providerContent.subject }),
                ...(providerContent.tags !== undefined && { tags: providerContent.tags }),
                ...(providerContent.text !== undefined && { text: providerContent.text }),
                ...(providerContent.to !== undefined && { to: providerContent.to }),
                ...(providerContent.ts !== undefined && { ts: providerContent.ts })
            };
        } catch (error) {
            const parsedError = MandrillErrorSchema.safeParse(error);
            if (parsedError.success && parsedError.data.response.data.name === 'Unknown_Message') {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: parsedError.data.response.data.message,
                    id: input.id
                });
            }
            throw error;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
