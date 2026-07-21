import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The unique Mandrill message ID returned from a send call. Example: "abc123"')
});

const ProviderOpenDetailSchema = z.object({
    ts: z.number().nullish(),
    ip: z.string().nullish(),
    location: z.string().nullish(),
    ua: z.string().nullish()
});

const ProviderClickDetailSchema = z.object({
    ts: z.number().nullish(),
    url: z.string().nullish(),
    ip: z.string().nullish(),
    location: z.string().nullish(),
    ua: z.string().nullish()
});

const ProviderSmtpEventSchema = z.object({
    ts: z.number().nullish(),
    type: z.string().nullish(),
    diag: z.string().nullish()
});

const ProviderResendSchema = z.object({
    ts: z.number().nullish()
});

const ProviderMessageDetailSchema = z.object({
    ts: z.number().nullish(),
    _id: z.string(),
    sender: z.string().nullish(),
    template: z.string().nullish(),
    subject: z.string().nullish(),
    email: z.string().nullish(),
    tags: z.array(z.string()).nullish(),
    opens: z.number().nullish(),
    opens_detail: z.array(ProviderOpenDetailSchema).nullish(),
    clicks: z.number().nullish(),
    clicks_detail: z.array(ProviderClickDetailSchema).nullish(),
    state: z.string().nullish(),
    metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).nullish(),
    smtp_events: z.array(ProviderSmtpEventSchema).nullish(),
    resends: z.array(ProviderResendSchema).nullish()
});

const OutputSchema = z.object({
    ts: z.number().optional(),
    _id: z.string().optional(),
    sender: z.string().optional(),
    template: z.string().optional(),
    subject: z.string().optional(),
    email: z.string().optional(),
    tags: z.array(z.string()).optional(),
    opens: z.number().optional(),
    opens_detail: z
        .array(
            z.object({
                ts: z.number().optional(),
                ip: z.string().optional(),
                location: z.string().optional(),
                ua: z.string().optional()
            })
        )
        .optional(),
    clicks: z.number().optional(),
    clicks_detail: z
        .array(
            z.object({
                ts: z.number().optional(),
                url: z.string().optional(),
                ip: z.string().optional(),
                location: z.string().optional(),
                ua: z.string().optional()
            })
        )
        .optional(),
    state: z.string().optional(),
    metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
    smtp_events: z
        .array(
            z.object({
                ts: z.number().optional(),
                type: z.string().optional(),
                diag: z.string().optional()
            })
        )
        .optional(),
    resends: z
        .array(
            z.object({
                ts: z.number().optional()
            })
        )
        .optional()
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
    description: 'Get delivery/tracking information for a single recently sent message.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;
        // @allowTryCatch Mandrill returns a 404 with a JSON error body for unknown message ids;
        // we map it to a descriptive ActionError instead of letting the raw provider error leak through.
        try {
            // https://mailchimp.com/developer/transactional/api/messages/get-message-info/
            response = await nango.post({
                endpoint: '1.3/messages/info.json',
                data: {
                    id: input.id
                },
                retries: 3
            });
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

        const raw = ProviderMessageDetailSchema.parse(response.data);

        return {
            ...(raw.ts != null && { ts: raw.ts }),
            ...(raw._id != null && { _id: raw._id }),
            ...(raw.sender != null && { sender: raw.sender }),
            ...(raw.template != null && { template: raw.template }),
            ...(raw.subject != null && { subject: raw.subject }),
            ...(raw.email != null && { email: raw.email }),
            ...(raw.tags != null && { tags: raw.tags }),
            ...(raw.opens != null && { opens: raw.opens }),
            ...(raw.opens_detail != null && {
                opens_detail: raw.opens_detail.map((detail) => ({
                    ...(detail.ts != null && { ts: detail.ts }),
                    ...(detail.ip != null && { ip: detail.ip }),
                    ...(detail.location != null && { location: detail.location }),
                    ...(detail.ua != null && { ua: detail.ua })
                }))
            }),
            ...(raw.clicks != null && { clicks: raw.clicks }),
            ...(raw.clicks_detail != null && {
                clicks_detail: raw.clicks_detail.map((detail) => ({
                    ...(detail.ts != null && { ts: detail.ts }),
                    ...(detail.url != null && { url: detail.url }),
                    ...(detail.ip != null && { ip: detail.ip }),
                    ...(detail.location != null && { location: detail.location }),
                    ...(detail.ua != null && { ua: detail.ua })
                }))
            }),
            ...(raw.state != null && { state: raw.state }),
            ...(raw.metadata != null && { metadata: raw.metadata }),
            ...(raw.smtp_events != null && {
                smtp_events: raw.smtp_events.map((event) => ({
                    ...(event.ts != null && { ts: event.ts }),
                    ...(event.type != null && { type: event.type }),
                    ...(event.diag != null && { diag: event.diag })
                }))
            }),
            ...(raw.resends != null && {
                resends: raw.resends.map((resend) => ({
                    ...(resend.ts != null && { ts: resend.ts })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
