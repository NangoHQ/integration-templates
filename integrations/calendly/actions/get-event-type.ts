import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    uuid: z.string().describe('The unique identifier (UUID) of the event type. Example: "AAAAAAAAAAAAAAAA"')
});

const ProviderEventTypeSchema = z.object({
    uri: z.string(),
    name: z.string().nullable().optional(),
    active: z.boolean(),
    slug: z.string().nullable().optional(),
    scheduling_url: z.string(),
    duration: z.number(),
    color: z.string().optional(),
    type: z.string(),
    kind: z.string().optional(),
    description_plain: z.string().nullable().optional(),
    description_html: z.string().nullable().optional(),
    internal_note: z.string().nullable().optional(),
    secret: z.boolean().optional(),
    booking_method: z.string().nullable().optional(),
    admin_managed: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    deleted_at: z.string().nullable().optional(),
    custom_questions: z.array(z.unknown()).optional(),
    duration_options: z.array(z.number()).optional(),
    is_paid: z.boolean().optional(),
    locale: z.string().optional(),
    locations: z.array(z.unknown()).optional(),
    pooling_type: z.string().nullable().optional(),
    position: z.number().optional(),
    profile: z
        .object({
            type: z.string(),
            name: z.string(),
            owner: z.string()
        })
        .optional()
});

const OutputSchema = z.object({
    uri: z.string(),
    name: z.string().optional(),
    active: z.boolean(),
    slug: z.string().optional(),
    scheduling_url: z.string(),
    duration: z.number(),
    color: z.string().optional(),
    type: z.string(),
    kind: z.string().optional(),
    description_plain: z.string().optional(),
    description_html: z.string().optional(),
    internal_note: z.string().optional(),
    secret: z.boolean().optional(),
    booking_method: z.string().optional(),
    admin_managed: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    deleted_at: z.string().optional(),
    custom_questions: z.array(z.unknown()).optional(),
    duration_options: z.array(z.number()).optional(),
    is_paid: z.boolean().optional(),
    locale: z.string().optional(),
    locations: z.array(z.unknown()).optional(),
    pooling_type: z.string().optional(),
    position: z.number().optional(),
    profile: z
        .object({
            type: z.string(),
            name: z.string(),
            owner: z.string()
        })
        .optional()
});

const action = createAction({
    description: 'Retrieve a single event type from Calendly.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-event-type',
        group: 'Event Types'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['event_types:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.calendly.com/api-docs/c1f9db4a585da-get-event-type
        const response = await nango.get({
            endpoint: `/event_types/${input.uuid}`,
            retries: 3
        });

        if (!response.data || !response.data.resource) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Event type not found',
                uuid: input.uuid
            });
        }

        const providerEventType = ProviderEventTypeSchema.parse(response.data.resource);

        return {
            uri: providerEventType.uri,
            ...(providerEventType.name != null && { name: providerEventType.name }),
            active: providerEventType.active,
            ...(providerEventType.slug != null && { slug: providerEventType.slug }),
            scheduling_url: providerEventType.scheduling_url,
            duration: providerEventType.duration,
            ...(providerEventType.color !== undefined && { color: providerEventType.color }),
            type: providerEventType.type,
            ...(providerEventType.kind !== undefined && { kind: providerEventType.kind }),
            ...(providerEventType.description_plain != null && { description_plain: providerEventType.description_plain }),
            ...(providerEventType.description_html != null && { description_html: providerEventType.description_html }),
            ...(providerEventType.internal_note != null && { internal_note: providerEventType.internal_note }),
            ...(providerEventType.secret !== undefined && { secret: providerEventType.secret }),
            ...(providerEventType.booking_method != null && { booking_method: providerEventType.booking_method }),
            ...(providerEventType.admin_managed !== undefined && { admin_managed: providerEventType.admin_managed }),
            ...(providerEventType.created_at !== undefined && { created_at: providerEventType.created_at }),
            ...(providerEventType.updated_at !== undefined && { updated_at: providerEventType.updated_at }),
            ...(providerEventType.deleted_at != null && { deleted_at: providerEventType.deleted_at }),
            ...(providerEventType.custom_questions !== undefined && { custom_questions: providerEventType.custom_questions }),
            ...(providerEventType.duration_options !== undefined && { duration_options: providerEventType.duration_options }),
            ...(providerEventType.is_paid !== undefined && { is_paid: providerEventType.is_paid }),
            ...(providerEventType.locale !== undefined && { locale: providerEventType.locale }),
            ...(providerEventType.locations !== undefined && { locations: providerEventType.locations }),
            ...(providerEventType.pooling_type != null && { pooling_type: providerEventType.pooling_type }),
            ...(providerEventType.position !== undefined && { position: providerEventType.position }),
            ...(providerEventType.profile !== undefined && { profile: providerEventType.profile })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
