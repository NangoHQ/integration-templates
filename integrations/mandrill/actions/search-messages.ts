import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    query: z.string().optional().describe('Search terms to filter results. Supports full-text search across message subject and email addresses.'),
    date_from: z.string().optional().describe('Start date for the search range (UTC).'),
    date_to: z.string().optional().describe('End date for the search range (UTC).'),
    tags: z.array(z.string()).optional().describe('Tags that must be present on matching messages.'),
    senders: z.array(z.string()).optional().describe('Sender addresses to filter by.'),
    api_keys: z.array(z.string()).optional().describe('API keys to filter by for subaccount isolation.'),
    limit: z.number().int().min(1).max(1000).optional().describe('Maximum number of results to return (max 1000).')
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

const ProviderMessageSchema = z.object({
    ts: z.number().nullish(),
    _id: z.string().nullish(),
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
    metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).nullish()
});

const MessageSchema = z.object({
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
    metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional()
});

const OutputSchema = z.array(MessageSchema);

function normalizeMessage(raw: z.infer<typeof ProviderMessageSchema>): z.infer<typeof MessageSchema> {
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
            opens_detail: raw.opens_detail
                .filter((d) => d != null)
                .map((d) => ({
                    ...(d.ts != null && { ts: d.ts }),
                    ...(d.ip != null && { ip: d.ip }),
                    ...(d.location != null && { location: d.location }),
                    ...(d.ua != null && { ua: d.ua })
                }))
        }),
        ...(raw.clicks != null && { clicks: raw.clicks }),
        ...(raw.clicks_detail != null && {
            clicks_detail: raw.clicks_detail
                .filter((d) => d != null)
                .map((d) => ({
                    ...(d.ts != null && { ts: d.ts }),
                    ...(d.url != null && { url: d.url }),
                    ...(d.ip != null && { ip: d.ip }),
                    ...(d.location != null && { location: d.location }),
                    ...(d.ua != null && { ua: d.ua })
                }))
        }),
        ...(raw.state != null && { state: raw.state }),
        ...(raw.metadata != null && { metadata: raw.metadata })
    };
}

const action = createAction({
    description: 'Search recently sent messages by date range, query, tags, senders, or API key.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/messages/search-messages-by-date/
            endpoint: '/1.0/messages/search.json',
            data: {
                ...(input.query !== undefined && { query: input.query }),
                ...(input.date_from !== undefined && { date_from: input.date_from }),
                ...(input.date_to !== undefined && { date_to: input.date_to }),
                ...(input.tags !== undefined && { tags: input.tags }),
                ...(input.senders !== undefined && { senders: input.senders }),
                ...(input.api_keys !== undefined && { api_keys: input.api_keys }),
                ...(input.limit !== undefined && { limit: input.limit })
            },
            retries: 3
        });

        const rawMessages = z.array(ProviderMessageSchema).parse(response.data);
        return rawMessages.map(normalizeMessage);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
