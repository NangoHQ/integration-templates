import { createSync } from 'nango';
import { z } from 'zod';

// https://developer.calendly.com/api-docs/eb8ee72701f99-list-event-invitees
const InviteeSchema = z.object({
    id: z.string().describe('The URI of the invitee (used as unique identifier)'),
    email: z.string(),
    name: z.string(),
    status: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    event: z.string(),
    canceled: z.boolean().optional(),
    rescheduled: z.boolean().optional(),
    cancel_url: z.string().optional(),
    reschedule_url: z.string().optional(),
    timezone: z.string().optional(),
    text_reminder_number: z.string().nullable().optional(),
    questions_and_answers: z
        .array(
            z.object({
                question: z.string(),
                answer: z.string(),
                position: z.number()
            })
        )
        .optional(),
    tracking: z
        .object({
            utm_campaign: z.string().nullable().optional(),
            utm_source: z.string().nullable().optional(),
            utm_medium: z.string().nullable().optional(),
            utm_content: z.string().nullable().optional(),
            utm_term: z.string().nullable().optional(),
            salesforce_uuid: z.string().nullable().optional()
        })
        .optional(),
    payment: z
        .object({
            external_id: z.string(),
            provider: z.string(),
            amount: z.number(),
            currency: z.string(),
            terms: z.string().optional(),
            successful: z.boolean()
        })
        .optional()
});

const EventSchema = z.object({
    uri: z.string(),
    updated_at: z.string()
});

const ScheduledEventsResponseSchema = z.object({
    collection: z.array(EventSchema),
    pagination: z
        .object({
            next_page: z.string().nullable().optional(),
            next_page_token: z.string().nullable().optional()
        })
        .optional()
});

const UserResponseSchema = z.object({
    resource: z.object({
        uri: z.string(),
        current_organization: z.string()
    })
});

const InviteesResponseSchema = z.object({
    collection: z.array(
        z.object({
            uri: z.string(),
            email: z.string(),
            name: z.string(),
            status: z.string(),
            created_at: z.string(),
            updated_at: z.string(),
            event: z.string(),
            canceled: z.boolean().optional(),
            rescheduled: z.boolean().optional(),
            cancel_url: z.string().optional(),
            reschedule_url: z.string().optional(),
            timezone: z.string().optional(),
            text_reminder_number: z.string().nullable().optional(),
            questions_and_answers: z
                .array(
                    z.object({
                        question: z.string(),
                        answer: z.string(),
                        position: z.number()
                    })
                )
                .optional(),
            tracking: z
                .object({
                    utm_campaign: z.string().nullable().optional(),
                    utm_source: z.string().nullable().optional(),
                    utm_medium: z.string().nullable().optional(),
                    utm_content: z.string().nullable().optional(),
                    utm_term: z.string().nullable().optional(),
                    salesforce_uuid: z.string().nullable().optional()
                })
                .optional(),
            payment: z
                .object({
                    external_id: z.string(),
                    provider: z.string(),
                    amount: z.number(),
                    currency: z.string(),
                    terms: z.string().optional(),
                    successful: z.boolean()
                })
                .optional()
        })
    ),
    pagination: z
        .object({
            next_page: z.string().nullable().optional(),
            next_page_token: z.string().nullable().optional()
        })
        .optional()
});

const CheckpointSchema = z.object({
    min_start_time: z.string(),
    events_page_token: z.string(),
    event_uri: z.string(),
    invitee_page_token: z.string()
});

type Invitee = z.infer<typeof InviteeSchema>;

function toCalendlyTimestamp(date: Date): string {
    return date.toISOString().replace(/\.(\d{3})Z$/, '.$1000Z');
}

function getNextPageToken(pagination?: { next_page?: string | null | undefined; next_page_token?: string | null | undefined }): string {
    if (pagination?.next_page_token) {
        return pagination.next_page_token;
    }

    if (!pagination?.next_page) {
        return '';
    }

    try {
        return new URL(pagination.next_page).searchParams.get('page_token') ?? '';
    } catch {
        return '';
    }
}

const sync = createSync({
    description: 'Sync event invitees from Calendly',
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'GET', path: '/event-invitees' }],
    checkpoint: CheckpointSchema,
    models: {
        Invitee: InviteeSchema
    },

    exec: async (nango) => {
        const currentRunStartTime = toCalendlyTimestamp(new Date());
        const rawCheckpoint = await nango.getCheckpoint();
        const minStartTime = typeof rawCheckpoint?.min_start_time === 'string' ? rawCheckpoint.min_start_time : '';
        let eventsPageToken = typeof rawCheckpoint?.events_page_token === 'string' ? rawCheckpoint.events_page_token : '';
        let resumeEventUri = typeof rawCheckpoint?.event_uri === 'string' ? rawCheckpoint.event_uri : '';
        let resumeInviteePageToken = typeof rawCheckpoint?.invitee_page_token === 'string' ? rawCheckpoint.invitee_page_token : '';

        // https://developer.calendly.com/api-docs/005832c83aeae-get-current-user
        const userResponse = await nango.get({
            endpoint: '/users/me',
            retries: 3
        });

        const parsedUser = UserResponseSchema.safeParse(userResponse.data);

        if (!parsedUser.success) {
            throw new Error(`Failed to parse current user response: ${parsedUser.error.message}`);
        }

        const organizationUri = parsedUser.data.resource.current_organization;

        while (true) {
            const scheduledEventsResponse = await nango.get({
                // https://developer.calendly.com/api-docs/d2941cdd8601c-list-events
                endpoint: '/scheduled_events',
                params: {
                    organization: organizationUri,
                    sort: 'start_time:asc',
                    count: 100,
                    ...(minStartTime && { min_start_time: minStartTime }),
                    ...(eventsPageToken && { page_token: eventsPageToken })
                },
                retries: 3
            });

            const parsedEvents = ScheduledEventsResponseSchema.safeParse(scheduledEventsResponse.data);

            if (!parsedEvents.success) {
                throw new Error(`Failed to parse scheduled events response: ${parsedEvents.error.message}`);
            }

            const nextEventsPageToken = getNextPageToken(parsedEvents.data.pagination);

            for (const event of parsedEvents.data.collection) {
                const eventUriParts = event.uri.split('/');
                const eventUuid = eventUriParts[eventUriParts.length - 1];

                if (!eventUuid) {
                    await nango.log(`Could not extract event UUID: ${event.uri}`, { level: 'warn' });
                    continue;
                }

                let inviteePageToken = resumeEventUri === event.uri ? resumeInviteePageToken : '';

                while (true) {
                    const response = await nango.get({
                        // https://developer.calendly.com/api-docs/eb8ee72701f99-list-event-invitees
                        endpoint: `/scheduled_events/${eventUuid}/invitees`,
                        params: {
                            count: 100,
                            ...(inviteePageToken && { page_token: inviteePageToken })
                        },
                        retries: 3
                    });

                    const parsedInvitees = InviteesResponseSchema.safeParse(response.data);

                    if (!parsedInvitees.success) {
                        throw new Error(`Failed to parse invitees response for ${eventUuid}: ${parsedInvitees.error.message}`);
                    }

                    const invitees: Invitee[] = parsedInvitees.data.collection.map((invitee) => ({
                        id: invitee.uri,
                        email: invitee.email,
                        name: invitee.name,
                        status: invitee.status,
                        created_at: invitee.created_at,
                        updated_at: invitee.updated_at,
                        event: invitee.event,
                        ...(invitee.canceled !== undefined && { canceled: invitee.canceled }),
                        ...(invitee.rescheduled !== undefined && { rescheduled: invitee.rescheduled }),
                        ...(invitee.cancel_url && { cancel_url: invitee.cancel_url }),
                        ...(invitee.reschedule_url && { reschedule_url: invitee.reschedule_url }),
                        ...(invitee.timezone && { timezone: invitee.timezone }),
                        ...(invitee.text_reminder_number !== undefined && { text_reminder_number: invitee.text_reminder_number }),
                        ...(invitee.questions_and_answers && { questions_and_answers: invitee.questions_and_answers }),
                        ...(invitee.tracking && { tracking: invitee.tracking }),
                        ...(invitee.payment && { payment: invitee.payment })
                    }));

                    if (invitees.length > 0) {
                        await nango.batchSave(invitees, 'Invitee');
                    }

                    const nextInviteePageToken = getNextPageToken(parsedInvitees.data.pagination);

                    if (!nextInviteePageToken) {
                        break;
                    }

                    inviteePageToken = nextInviteePageToken;

                    await nango.saveCheckpoint({
                        min_start_time: minStartTime,
                        events_page_token: eventsPageToken,
                        event_uri: event.uri,
                        invitee_page_token: inviteePageToken
                    });
                }

                if (resumeEventUri === event.uri) {
                    resumeEventUri = '';
                    resumeInviteePageToken = '';
                }
            }

            if (!nextEventsPageToken) {
                break;
            }

            eventsPageToken = nextEventsPageToken;
            resumeEventUri = '';
            resumeInviteePageToken = '';

            await nango.saveCheckpoint({
                min_start_time: minStartTime,
                events_page_token: eventsPageToken,
                event_uri: '',
                invitee_page_token: ''
            });
        }

        await nango.saveCheckpoint({
            min_start_time: currentRunStartTime,
            events_page_token: '',
            event_uri: '',
            invitee_page_token: ''
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
