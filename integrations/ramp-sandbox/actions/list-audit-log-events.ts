import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const EntityReferenceSchema = z.object({
    label: z.string().describe('Human-readable label of the referenced object.'),
    resource_name: z.string().describe('Type of the referenced resource, for example "Transaction" or "Card".'),
    url: z.string().describe('Ramp app-relative URL for the referenced object.')
});

const PrimaryReferenceSchema = z.object({
    id: z.string().optional().describe('Unique identifier of the primary referenced object, when available.'),
    label: z.string().describe('Human-readable label of the primary referenced object.'),
    resource_name: z.string().describe('Type of the primary referenced resource, for example "Transaction" or "Vendor / Merchant".'),
    url: z.string().describe('Ramp app-relative URL for the primary referenced object.')
});

const ActorDetailsSchema = z.object({
    actor_type: z.string().optional().describe('Type of the actor: "policy_agent", "ramp", "spend_request_agent", or "user".'),
    id: z.string().optional().describe('Unique identifier of the actor user, when the actor is a user.')
});

const UserDetailsSchema = z.object({
    actor_type: z.string().describe('Type of the actor the event is attributed to.'),
    id: z.string().optional().describe('Unique identifier of the user, when available.')
});

const AgentDetailsSchema = z.object({
    agent_name: z.string().describe('Customer-visible name of the agent that executed the action.')
});

const EventDetailsSchema = z.object({
    references: z.array(EntityReferenceSchema).describe('Objects referenced by the event.')
});

const AuditLogEventSchema = z.object({
    id: z.string().describe('Unique identifier of the audit log event.'),
    event_type: z.string().describe('Type of the audit log event, for example "Transaction cleared" or "Transaction paid".'),
    event_time: z.string().describe('ISO-8601 timestamp of when the event occurred.'),
    actor_type: z.string().optional().describe('Type of the actor the event is attributed to.'),
    actor_id: z.string().optional().describe('Unique identifier of the actor, when available.'),
    additional_details: z.string().optional().describe('Extra free-text context about the event, when available.'),
    actor_details: ActorDetailsSchema.optional().describe('Details of the actor the event is attributed to.'),
    agent_details: AgentDetailsSchema.optional().describe("Agent that executed the action on the user's behalf, when applicable."),
    user_details: UserDetailsSchema.optional().describe('User the event is attributed to, when applicable.'),
    primary_reference: PrimaryReferenceSchema.optional().describe('Primary object referenced by the event, when available.'),
    event_details: EventDetailsSchema.optional().describe('References to the objects involved in the event.')
});

const ProviderAuditLogEventSchema = z.object({
    id: z.string(),
    event_type: z.string(),
    event_time: z.string(),
    actor_type: z.string().optional(),
    actor_id: z.string().nullish(),
    additional_details: z.string().nullish(),
    actor_details: z
        .object({
            actor_type: z.string().optional(),
            id: z.string().nullish()
        })
        .nullish(),
    agent_details: AgentDetailsSchema.nullish(),
    user_details: z
        .object({
            actor_type: z.string(),
            id: z.string().nullish()
        })
        .nullish(),
    primary_reference: z
        .object({
            id: z.string().nullish(),
            label: z.string(),
            resource_name: z.string(),
            url: z.string()
        })
        .nullish(),
    event_details: EventDetailsSchema.optional()
});

const ResponseSchema = z.object({
    data: z.array(ProviderAuditLogEventSchema),
    page: z
        .object({
            next: z.string().nullable().optional()
        })
        .optional()
});

const InputSchema = z
    .object({
        user_ids: z
            .array(z.string())
            .optional()
            .describe('Only return events attributed to these user IDs. Example: ["07323c8f-c449-4222-a970-8cc4cf673711"].'),
        from_date: z.string().optional().describe('Only return events at or after this time, as a full ISO-8601 datetime. Example: "2026-10-01T00:00:00Z".'),
        to_date: z.string().optional().describe('Only return events at or before this time, as a full ISO-8601 datetime. Example: "2026-12-31T00:00:00Z".'),
        event_actor_types: z
            .array(z.enum(['policy_agent', 'ramp', 'spend_request_agent', 'user']))
            .optional()
            .describe('Only return events performed by these actor types.'),
        event_types: z.array(z.string()).optional().describe('Only return events of these event types. Example: ["Transaction cleared", "Transaction paid"].'),
        object_id: z
            .string()
            .optional()
            .describe('Only return events referencing this object ID, for example a transaction or vendor ID. Must be provided together with resource_name.'),
        resource_name: z
            .enum([
                'Accounting rule group',
                'Approvals',
                'Bill payment',
                'Bill template',
                'Card',
                'Cash Manager recommendation',
                'Fixed asset class',
                'Fixed asset',
                'Forecast custom input',
                'Fund request',
                'Investment account',
                'Legal entity',
                'Managed portfolio transfer',
                'Payment run',
                'Reimbursement',
                'SFTP Configurations',
                'Separation of duties',
                'Spend allocation',
                'Spend event',
                'Spend program',
                'Transaction',
                'Travel (Booking request)',
                'Travel (Trip)',
                'Treasury account',
                'User',
                'Vendor / Merchant',
                'WBX Policy',
                'WBX Request',
                'Wallet automation policy',
                'Wallet transfer',
                'Workflow (Base)',
                'Workflow'
            ])
            .optional()
            .describe('Only return events referencing this resource type. Must be provided together with object_id.'),
        agent_names: z.array(z.string()).optional().describe('Only return events performed by agents with these customer-visible labels.'),
        cursor: z
            .string()
            .regex(/^\S+$/)
            .optional()
            .describe('Opaque pagination cursor returned as next_cursor by the previous call. Omit for the first page.'),
        page_size: z.number().int().min(2).max(100).optional().describe('Number of events to return per page, between 2 and 100. Defaults to 20.')
    })
    // Ramp rejects either filter on its own with a 422 ("object_id and resource_name must be provided together").
    .refine((data) => (data.object_id === undefined) === (data.resource_name === undefined), {
        message: 'object_id and resource_name must be provided together.',
        path: ['object_id']
    })
    .describe('Filters and pagination options for listing business-wide audit log events.');

const OutputSchema = z
    .object({
        items: z.array(AuditLogEventSchema).describe('Audit log events returned for this page.'),
        next_cursor: z
            .string()
            .optional()
            .describe('Cursor for the next page; pass it back as cursor to fetch more events. Omitted when there are no more pages.')
    })
    .describe('A page of business-wide audit log events.');

/**
 * @tags: [read]
 * @tagReason: Lists business-wide audit log events; it only reads provider data and never mutates it.
 * @pitfalls: from_date/to_date must be full ISO-8601 datetimes, object_id and resource_name must be supplied together (Ramp rejects either one alone with a 422), and event_types must exactly match Ramp's event type strings such as "Transaction cleared".
 */
const action = createAction({
    description: 'List business-wide audit log events (logins, approvals, transaction state changes, settings changes, etc).',
    version: '1.0.0',
    scopes: ['audit_logs:read'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};

        if (input.user_ids !== undefined) {
            params['user_ids'] = input.user_ids.join(',');
        }
        if (input.from_date !== undefined) {
            params['from_date'] = input.from_date;
        }
        if (input.to_date !== undefined) {
            params['to_date'] = input.to_date;
        }
        if (input.event_actor_types !== undefined) {
            params['event_actor_types'] = input.event_actor_types.join(',');
        }
        if (input.event_types !== undefined) {
            params['event_types'] = input.event_types.join(',');
        }
        if (input.object_id !== undefined) {
            params['object_id'] = input.object_id;
        }
        if (input.resource_name !== undefined) {
            params['resource_name'] = input.resource_name;
        }
        if (input.agent_names !== undefined) {
            params['agent_names'] = input.agent_names.join(',');
        }
        if (input.cursor !== undefined) {
            params['start'] = input.cursor;
        }
        if (input.page_size !== undefined) {
            params['page_size'] = input.page_size;
        }

        const config: ProxyConfiguration = {
            // https://docs.ramp.com/developer-api/v1/overview/introduction
            endpoint: '/developer/v1/audit-logs/events',
            params,
            retries: 3
        };

        const response = await nango.get(config);
        const parsed = ResponseSchema.parse(response.data);

        let next_cursor: string | undefined;
        const nextUrl = parsed.page?.next;
        if (nextUrl != null && nextUrl !== '') {
            const start = new URL(nextUrl).searchParams.get('start');
            if (start != null && start !== '') {
                next_cursor = start;
            }
        }

        return {
            items: parsed.data.map((event) => ({
                id: event.id,
                event_type: event.event_type,
                event_time: event.event_time,
                ...(event.actor_type != null && { actor_type: event.actor_type }),
                ...(event.actor_id != null && { actor_id: event.actor_id }),
                ...(event.additional_details != null && { additional_details: event.additional_details }),
                ...(event.actor_details != null && {
                    actor_details: {
                        ...(event.actor_details.actor_type != null && { actor_type: event.actor_details.actor_type }),
                        ...(event.actor_details.id != null && { id: event.actor_details.id })
                    }
                }),
                ...(event.agent_details != null && { agent_details: event.agent_details }),
                ...(event.user_details != null && {
                    user_details: {
                        actor_type: event.user_details.actor_type,
                        ...(event.user_details.id != null && { id: event.user_details.id })
                    }
                }),
                ...(event.primary_reference != null && {
                    primary_reference: {
                        ...(event.primary_reference.id != null && { id: event.primary_reference.id }),
                        label: event.primary_reference.label,
                        resource_name: event.primary_reference.resource_name,
                        url: event.primary_reference.url
                    }
                }),
                ...(event.event_details != null && { event_details: event.event_details })
            })),
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
