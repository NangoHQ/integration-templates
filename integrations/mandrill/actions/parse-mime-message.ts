import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    raw_message: z.string().describe('The full MIME document of the message to parse.')
});

const ToRecipientSchema = z.object({
    email: z.string().optional(),
    name: z.string().nullable().optional()
});

const AttachmentSchema = z.object({
    name: z.string().optional(),
    type: z.string().optional(),
    binary: z.boolean().optional(),
    content: z.string().optional()
});

const ImageSchema = z.object({
    name: z.string().optional(),
    type: z.string().optional(),
    content: z.string().optional()
});

const ProviderResponseSchema = z.object({
    subject: z.string().optional(),
    from_email: z.string().optional(),
    from_name: z.string().optional(),
    to: z.array(ToRecipientSchema).optional(),
    headers: z.record(z.string(), z.unknown()).optional(),
    text: z.string().nullable().optional(),
    html: z.string().nullable().optional(),
    attachments: z.array(AttachmentSchema).optional(),
    images: z.array(ImageSchema).optional()
});

const OutputSchema = z.object({
    subject: z.string().optional(),
    from_email: z.string().optional(),
    from_name: z.string().optional(),
    to: z
        .array(
            z.object({
                email: z.string().optional(),
                name: z.string().optional()
            })
        )
        .optional(),
    headers: z.record(z.string(), z.unknown()).optional(),
    text: z.string().optional(),
    html: z.string().optional(),
    attachments: z
        .array(
            z.object({
                name: z.string().optional(),
                type: z.string().optional(),
                binary: z.boolean().optional(),
                content: z.string().optional()
            })
        )
        .optional(),
    images: z
        .array(
            z.object({
                name: z.string().optional(),
                type: z.string().optional(),
                content: z.string().optional()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Parse a raw MIME document into its constituent pieces (headers, text, html, attachments) without sending it.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/messages/parse-mime-document/
            endpoint: '1.0/messages/parse.json',
            data: {
                raw_message: input.raw_message
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            ...(parsed.subject !== undefined && { subject: parsed.subject }),
            ...(parsed.from_email !== undefined && { from_email: parsed.from_email }),
            ...(parsed.from_name !== undefined && { from_name: parsed.from_name }),
            ...(parsed.to !== undefined && {
                to: parsed.to.map((r) => ({
                    ...(r.email !== undefined && { email: r.email }),
                    ...(r.name != null && { name: r.name })
                }))
            }),
            ...(parsed.headers !== undefined && { headers: parsed.headers }),
            ...(parsed.text != null && { text: parsed.text }),
            ...(parsed.html != null && { html: parsed.html }),
            ...(parsed.attachments !== undefined && {
                attachments: parsed.attachments.map((a) => ({
                    ...(a.name !== undefined && { name: a.name }),
                    ...(a.type !== undefined && { type: a.type }),
                    ...(a.binary !== undefined && { binary: a.binary }),
                    ...(a.content !== undefined && { content: a.content })
                }))
            }),
            ...(parsed.images !== undefined && {
                images: parsed.images.map((i) => ({
                    ...(i.name !== undefined && { name: i.name }),
                    ...(i.type !== undefined && { type: i.type }),
                    ...(i.content !== undefined && { content: i.content })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
