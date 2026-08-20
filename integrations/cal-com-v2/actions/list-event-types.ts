import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        username: z.string().optional().describe('The username of the user to get event types for.'),
        eventSlug: z.string().optional().describe('Slug of a specific event type to return. If provided, username must also be provided.'),
        usernames: z.string().optional().describe('Comma-separated usernames to get dynamic event types for multiple users.'),
        orgSlug: z.string().optional().describe("Slug of the user's organization. orgId is not required if using this parameter."),
        orgId: z.number().optional().describe('ID of the organization. orgSlug is not needed when using this parameter.'),
        sortCreatedAt: z.enum(['asc', 'desc']).optional().describe('Sort event types by creation date. When not provided, no explicit ordering is applied.')
    })
    .refine((input) => input.eventSlug === undefined || input.username !== undefined, {
        message: 'username is required when eventSlug is provided',
        path: ['username']
    })
    .describe('Input for listing Cal.com event types');

const ProviderUserSchema = z.object({
    id: z.number(),
    username: z.string().optional(),
    name: z.string().nullable().optional(),
    email: z.string().optional()
});

const ProviderEventTypeSchema = z
    .object({
        id: z.number(),
        lengthInMinutes: z.number(),
        title: z.string(),
        slug: z.string(),
        description: z.string().nullable().optional(),
        locations: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
        disableGuests: z.boolean().optional(),
        hidden: z.boolean().optional(),
        bookingRequiresAuthentication: z.boolean().optional(),
        ownerId: z.number(),
        users: z.array(ProviderUserSchema).nullable().optional(),
        bookingUrl: z.string().optional(),
        scheduleId: z.number().nullable().optional(),
        isInstantEvent: z.boolean().optional(),
        price: z.number().optional(),
        currency: z.string().optional(),
        recurrence: z.record(z.string(), z.unknown()).nullable().optional(),
        metadata: z.record(z.string(), z.unknown()).nullable().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    status: z.enum(['success', 'error']),
    data: z.unknown().optional()
});

const UserSchema = z.object({
    id: z.number().describe('Unique identifier of the user.'),
    username: z.string().optional().describe('Username of the user.'),
    name: z.string().optional().describe('Display name of the user.'),
    email: z.string().optional().describe('Email address of the user.')
});

const EventTypeSchema = z.object({
    id: z.number().describe('Unique identifier of the event type.'),
    title: z.string().describe('Title of the event type.'),
    slug: z.string().describe('URL-friendly identifier of the event type.'),
    description: z.string().optional().describe('Description of the event type.'),
    lengthInMinutes: z.number().describe('Duration of the event type in minutes.'),
    price: z.number().optional().describe('Price of the event type booking.'),
    currency: z.string().optional().describe('Currency of the price.'),
    hidden: z.boolean().optional().describe('Whether the event type is hidden from the booking page.'),
    bookingRequiresAuthentication: z.boolean().optional().describe('Whether booking this event type requires authentication.'),
    ownerId: z.number().describe('ID of the user who owns this event type.'),
    bookingUrl: z.string().optional().describe('Full URL to the booking page for this event type.'),
    scheduleId: z.number().optional().describe('ID of the schedule associated with this event type.'),
    isInstantEvent: z.boolean().optional().describe('Whether this is an instant event type.'),
    disableGuests: z.boolean().optional().describe('Whether guests are disabled for this event type.'),
    locations: z.array(z.record(z.string(), z.unknown())).optional().describe('Locations where the event will take place.'),
    users: z.array(UserSchema).optional().describe('Users associated with this event type.')
});

const OutputSchema = z
    .object({
        eventTypes: z.array(EventTypeSchema).describe('List of event types matching the filters.')
    })
    .describe('Output for listing Cal.com event types');

/**
 * @tags: [read]
 * @tagReason: Reads event types from the Cal.com API.
 * @pitfalls: Hidden event types are only returned to authenticated owners. eventSlug requires username because multiple users can share the same slug. Results have no explicit ordering when sortCreatedAt is omitted.
 */
const action = createAction({
    description: 'List event types from Cal.com.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['EVENT_TYPE_READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;
        // @allowTryCatch: The Nango SDK throws for non-2xx responses. Convert Cal.com's error
        // envelope into a structured ActionError instead of letting the raw error propagate.
        try {
            response = await nango.get({
                // https://cal.com/docs/api-reference/v2/event-types/get-all-event-types
                endpoint: '/event-types',
                params: {
                    ...(input.username !== undefined && { username: input.username }),
                    ...(input.eventSlug !== undefined && { eventSlug: input.eventSlug }),
                    ...(input.usernames !== undefined && { usernames: input.usernames }),
                    ...(input.orgSlug !== undefined && { orgSlug: input.orgSlug }),
                    ...(input.orgId !== undefined && { orgId: String(input.orgId) }),
                    ...(input.sortCreatedAt !== undefined && { sortCreatedAt: input.sortCreatedAt })
                },
                headers: {
                    'cal-api-version': '2024-06-14'
                },
                retries: 3
            });
        } catch (err: unknown) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Cal.com API returned an error status when listing event types.',
                details: err instanceof Error ? err.message : String(err)
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.status !== 'success') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Cal.com API returned an error status when listing event types.'
            });
        }

        const parsedEventTypes = z.array(ProviderEventTypeSchema).safeParse(providerResponse.data);
        if (!parsedEventTypes.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Cal.com API returned an unexpected response format when listing event types.',
                details: parsedEventTypes.error.issues
            });
        }
        const eventTypes = parsedEventTypes.data;

        return {
            eventTypes: eventTypes.map((item) => ({
                id: item.id,
                title: item.title,
                slug: item.slug,
                ...(item.description != null && { description: item.description }),
                lengthInMinutes: item.lengthInMinutes,
                ...(item.price !== undefined && { price: item.price }),
                ...(item.currency !== undefined && { currency: item.currency }),
                ...(item.hidden !== undefined && { hidden: item.hidden }),
                ...(item.bookingRequiresAuthentication !== undefined && { bookingRequiresAuthentication: item.bookingRequiresAuthentication }),
                ownerId: item.ownerId,
                ...(item.bookingUrl !== undefined && { bookingUrl: item.bookingUrl }),
                ...(item.scheduleId != null && { scheduleId: item.scheduleId }),
                ...(item.isInstantEvent !== undefined && { isInstantEvent: item.isInstantEvent }),
                ...(item.disableGuests !== undefined && { disableGuests: item.disableGuests }),
                ...(item.locations != null && { locations: item.locations }),
                ...(item.users != null && {
                    users: item.users.map((user) => ({
                        id: user.id,
                        ...(user.username !== undefined && { username: user.username }),
                        ...(user.name != null && { name: user.name }),
                        ...(user.email !== undefined && { email: user.email })
                    }))
                })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
