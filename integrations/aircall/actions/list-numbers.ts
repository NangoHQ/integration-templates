import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.')
});

const ProviderMetaSchema = z.object({
    count: z.number(),
    total: z.number(),
    current_page: z.number(),
    per_page: z.number(),
    next_page_link: z.string().nullable(),
    previous_page_link: z.string().nullable()
});

const ProviderMessagesSchema = z.object({
    welcome: z.string().optional(),
    waiting: z.string().optional(),
    ringing_tone: z.string().optional(),
    unanswered_call: z.string().optional(),
    after_hours: z.string().optional(),
    ivr: z.string().optional(),
    voicemail: z.string().optional(),
    closed: z.string().optional(),
    callback_later: z.string().optional()
});

const ProviderNumberSchema = z
    .object({
        id: z.number(),
        direct_link: z.string(),
        name: z.string(),
        digits: z.string(),
        e164_digits: z.string().optional(),
        created_at: z.string(),
        country: z.string(),
        time_zone: z.string(),
        open: z.boolean(),
        availability_status: z.string(),
        is_ivr: z.boolean(),
        live_recording_activated: z.boolean(),
        users: z.array(z.unknown()).optional(),
        priority: z.number().nullable().optional(),
        messages: ProviderMessagesSchema.optional(),
        voicemail: z.string().optional(),
        closed: z.string().optional(),
        callback_later: z.string().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    meta: ProviderMetaSchema,
    numbers: z.array(ProviderNumberSchema)
});

const MessagesSchema = z.object({
    welcome: z.string().optional(),
    waiting: z.string().optional(),
    ringing_tone: z.string().optional(),
    unanswered_call: z.string().optional(),
    after_hours: z.string().optional(),
    ivr: z.string().optional(),
    voicemail: z.string().optional(),
    closed: z.string().optional(),
    callback_later: z.string().optional()
});

const NumberSchema = z
    .object({
        id: z.number(),
        direct_link: z.string(),
        name: z.string(),
        digits: z.string(),
        e164_digits: z.string().optional(),
        created_at: z.string(),
        country: z.string(),
        time_zone: z.string(),
        open: z.boolean(),
        availability_status: z.string(),
        is_ivr: z.boolean(),
        live_recording_activated: z.boolean(),
        users: z.array(z.unknown()).optional(),
        priority: z.number().optional(),
        messages: MessagesSchema.optional(),
        voicemail: z.string().optional(),
        closed: z.string().optional(),
        callback_later: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(NumberSchema),
    next_page_link: z.string().optional()
});

const action = createAction({
    description: 'List numbers from Aircall.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public_api'],
    endpoint: {
        path: '/actions/list-numbers',
        method: 'GET'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (Number.isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a positive integer representing a page number.'
            });
        }

        const config: ProxyConfiguration = {
            // https://developer.aircall.io/api-references/#list-all-numbers
            endpoint: '/v1/numbers',
            params: {
                page: page,
                per_page: 50
            },
            retries: 3
        };

        const response = await nango.get(config);
        const data = ProviderResponseSchema.parse(response.data);

        return {
            items: data.numbers.map((number) => ({
                id: number.id,
                direct_link: number.direct_link,
                name: number.name,
                digits: number.digits,
                ...(number.e164_digits !== undefined && { e164_digits: number.e164_digits }),
                created_at: number.created_at,
                country: number.country,
                time_zone: number.time_zone,
                open: number.open,
                availability_status: number.availability_status,
                is_ivr: number.is_ivr,
                live_recording_activated: number.live_recording_activated,
                ...(number.users !== undefined && { users: number.users }),
                ...(number.priority !== null && number.priority !== undefined && { priority: number.priority }),
                ...(number.messages !== undefined && { messages: number.messages }),
                ...(number.voicemail !== undefined && { voicemail: number.voicemail }),
                ...(number.closed !== undefined && { closed: number.closed }),
                ...(number.callback_later !== undefined && { callback_later: number.callback_later })
            })),
            ...(data.meta.next_page_link !== null && { next_page_link: data.meta.next_page_link })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
