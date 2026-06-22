import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    query: z.string().optional().describe('Search string to filter calls by phone number, contact name, or other criteria.'),
    from: z.number().optional().describe('Minimum call creation date as a Unix timestamp.'),
    to: z.number().optional().describe('Maximum call creation date as a Unix timestamp.'),
    page: z.number().optional().describe('Page number for pagination. Defaults to 1.'),
    per_page: z.number().optional().describe('Number of results per page. Maximum is 50.')
});

const CallUserSchema = z.object({
    id: z.number(),
    direct_link: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    available: z.boolean().optional(),
    availability_status: z.string().optional(),
    created_at: z.string().optional(),
    time_zone: z.string().optional(),
    language: z.string().optional()
});

const CallNumberSchema = z.object({
    id: z.number(),
    direct_link: z.string().optional(),
    name: z.string().optional(),
    digits: z.string().optional(),
    created_at: z.string().optional(),
    country: z.string().optional(),
    time_zone: z.string().optional(),
    open: z.boolean().optional(),
    availability_status: z.string().optional(),
    is_ivr: z.boolean().optional(),
    live_recording_activated: z.boolean().optional(),
    priority: z.string().nullable().optional()
});

const CallSchema = z.object({
    id: z.number(),
    sid: z.string().optional(),
    direct_link: z.string().optional(),
    direction: z.string().optional(),
    status: z.string().optional(),
    missed_call_reason: z.string().nullable().optional(),
    started_at: z.number().optional(),
    answered_at: z.number().nullable().optional(),
    ended_at: z.number().optional(),
    duration: z.number().optional(),
    voicemail: z.unknown().nullable().optional(),
    recording: z.unknown().nullable().optional(),
    asset: z.unknown().nullable().optional(),
    raw_digits: z.string().optional(),
    user: CallUserSchema.nullable().optional(),
    contact: z.unknown().nullable().optional(),
    archived: z.boolean().optional(),
    assigned_to: z.unknown().nullable().optional(),
    transferred_by: z.unknown().nullable().optional(),
    transferred_to: z.unknown().nullable().optional(),
    cost: z.string().optional(),
    number: CallNumberSchema.optional(),
    comments: z.array(z.unknown()).optional(),
    tags: z.array(z.unknown()).optional(),
    teams: z.array(z.unknown()).optional(),
    ivr_options_selected: z.array(z.unknown()).optional()
});

const MetaSchema = z.object({
    count: z.number().optional(),
    total: z.number().optional(),
    current_page: z.number().optional(),
    per_page: z.number().optional(),
    next_page_link: z.string().nullable().optional(),
    previous_page_link: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    meta: MetaSchema.optional(),
    calls: z.array(CallSchema).optional()
});

const OutputSchema = z.object({
    calls: z.array(
        z.object({
            id: z.number(),
            sid: z.string().optional(),
            direct_link: z.string().optional(),
            direction: z.string().optional(),
            status: z.string().optional(),
            missed_call_reason: z.string().optional(),
            started_at: z.number().optional(),
            answered_at: z.number().optional(),
            ended_at: z.number().optional(),
            duration: z.number().optional(),
            voicemail: z.unknown().optional(),
            recording: z.unknown().optional(),
            asset: z.unknown().optional(),
            raw_digits: z.string().optional(),
            user: z
                .object({
                    id: z.number(),
                    direct_link: z.string().optional(),
                    name: z.string().optional(),
                    email: z.string().optional(),
                    available: z.boolean().optional(),
                    availability_status: z.string().optional(),
                    created_at: z.string().optional(),
                    time_zone: z.string().optional(),
                    language: z.string().optional()
                })
                .optional(),
            contact: z.unknown().optional(),
            archived: z.boolean().optional(),
            assigned_to: z.unknown().optional(),
            transferred_by: z.unknown().optional(),
            transferred_to: z.unknown().optional(),
            cost: z.string().optional(),
            number: z
                .object({
                    id: z.number(),
                    direct_link: z.string().optional(),
                    name: z.string().optional(),
                    digits: z.string().optional(),
                    created_at: z.string().optional(),
                    country: z.string().optional(),
                    time_zone: z.string().optional(),
                    open: z.boolean().optional(),
                    availability_status: z.string().optional(),
                    is_ivr: z.boolean().optional(),
                    live_recording_activated: z.boolean().optional(),
                    priority: z.string().optional()
                })
                .optional(),
            comments: z.array(z.unknown()).optional(),
            tags: z.array(z.unknown()).optional(),
            teams: z.array(z.unknown()).optional(),
            ivr_options_selected: z.array(z.unknown()).optional()
        })
    ),
    next_page: z.number().optional(),
    total: z.number().optional()
});

const action = createAction({
    description: 'Search calls in Aircall by phone number, contact name, or other criteria.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public_api'],
    endpoint: {
        path: '/actions/search-calls',
        method: 'GET'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: { phone_number?: string; from?: number; to?: number; page?: number; per_page?: number } = {};
        if (input.query !== undefined) {
            params.phone_number = input.query;
        }
        if (input.from !== undefined) {
            params.from = input.from;
        }
        if (input.to !== undefined) {
            params.to = input.to;
        }
        if (input.page !== undefined) {
            params.page = input.page;
        }
        if (input.per_page !== undefined) {
            params.per_page = input.per_page;
        }

        // https://developer.aircall.io/api-references/#search-calls
        const response = await nango.get({
            endpoint: '/v1/calls/search',
            params: params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const meta = providerResponse.meta;
        const calls = providerResponse.calls || [];

        const nextPage = meta?.next_page_link ? (meta.current_page ? meta.current_page + 1 : undefined) : undefined;

        return {
            calls: calls.map((call) => ({
                id: call.id,
                ...(call.sid !== undefined && { sid: call.sid }),
                ...(call.direct_link !== undefined && { direct_link: call.direct_link }),
                ...(call.direction !== undefined && { direction: call.direction }),
                ...(call.status !== undefined && { status: call.status }),
                ...(call.missed_call_reason !== undefined && call.missed_call_reason !== null && { missed_call_reason: call.missed_call_reason }),
                ...(call.started_at !== undefined && { started_at: call.started_at }),
                ...(call.answered_at !== undefined && call.answered_at !== null && { answered_at: call.answered_at }),
                ...(call.ended_at !== undefined && { ended_at: call.ended_at }),
                ...(call.duration !== undefined && { duration: call.duration }),
                ...(call.voicemail !== undefined && call.voicemail !== null && { voicemail: call.voicemail }),
                ...(call.recording !== undefined && call.recording !== null && { recording: call.recording }),
                ...(call.asset !== undefined && call.asset !== null && { asset: call.asset }),
                ...(call.raw_digits !== undefined && { raw_digits: call.raw_digits }),
                ...(call.user !== undefined &&
                    call.user !== null && {
                        user: {
                            id: call.user.id,
                            ...(call.user.direct_link !== undefined && { direct_link: call.user.direct_link }),
                            ...(call.user.name !== undefined && { name: call.user.name }),
                            ...(call.user.email !== undefined && { email: call.user.email }),
                            ...(call.user.available !== undefined && { available: call.user.available }),
                            ...(call.user.availability_status !== undefined && { availability_status: call.user.availability_status }),
                            ...(call.user.created_at !== undefined && { created_at: call.user.created_at }),
                            ...(call.user.time_zone !== undefined && { time_zone: call.user.time_zone }),
                            ...(call.user.language !== undefined && { language: call.user.language })
                        }
                    }),
                ...(call.contact !== undefined && call.contact !== null && { contact: call.contact }),
                ...(call.archived !== undefined && { archived: call.archived }),
                ...(call.assigned_to !== undefined && call.assigned_to !== null && { assigned_to: call.assigned_to }),
                ...(call.transferred_by !== undefined && call.transferred_by !== null && { transferred_by: call.transferred_by }),
                ...(call.transferred_to !== undefined && call.transferred_to !== null && { transferred_to: call.transferred_to }),
                ...(call.cost !== undefined && { cost: call.cost }),
                ...(call.number !== undefined && {
                    number: {
                        id: call.number.id,
                        ...(call.number.direct_link !== undefined && { direct_link: call.number.direct_link }),
                        ...(call.number.name !== undefined && { name: call.number.name }),
                        ...(call.number.digits !== undefined && { digits: call.number.digits }),
                        ...(call.number.created_at !== undefined && { created_at: call.number.created_at }),
                        ...(call.number.country !== undefined && { country: call.number.country }),
                        ...(call.number.time_zone !== undefined && { time_zone: call.number.time_zone }),
                        ...(call.number.open !== undefined && { open: call.number.open }),
                        ...(call.number.availability_status !== undefined && { availability_status: call.number.availability_status }),
                        ...(call.number.is_ivr !== undefined && { is_ivr: call.number.is_ivr }),
                        ...(call.number.live_recording_activated !== undefined && { live_recording_activated: call.number.live_recording_activated }),
                        ...(call.number.priority !== undefined && call.number.priority !== null && { priority: call.number.priority })
                    }
                }),
                ...(call.comments !== undefined && { comments: call.comments }),
                ...(call.tags !== undefined && { tags: call.tags }),
                ...(call.teams !== undefined && { teams: call.teams }),
                ...(call.ivr_options_selected !== undefined && { ivr_options_selected: call.ivr_options_selected })
            })),
            ...(nextPage !== undefined && { next_page: nextPage }),
            ...(meta?.total !== undefined && { total: meta.total })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
