import { createSync } from 'nango';
import type { ZendeskTicket } from '../types.js';
import type { PaginationParams } from '../helpers/paginate.js';
import { paginate } from '../helpers/paginate.js';

import { Ticket } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches a list of tickets from Zendesk',
    version: '2.0.0',
    frequency: 'every 1 hour',
    autoStart: true,
    syncType: 'incremental',

    endpoints: [
        {
            method: 'GET',
            path: '/tickets',
            group: 'Tickets'
        }
    ],

    scopes: ['tickets:read'],

    models: {
        Ticket: Ticket
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const ticketCache = new Set<string>();
        const config: PaginationParams = {
            // https://developer.zendesk.com/documentation/ticketing/managing-tickets/using-the-incremental-export-api/#time-based-incremental-exports
            // https://developer.zendesk.com/api-reference/ticketing/ticket-management/incremental_exports/#incremental-ticket-export-time-based
            endpoint: '/api/v2/incremental/tickets.json',
            startTime: nango.lastSyncDate ? Math.floor(new Date(nango.lastSyncDate).getTime() / 1000) : 0, // Default to 0 for full sync if lastSyncDate is not present
            pathName: 'tickets'
        };

        for await (const { results } of paginate<ZendeskTicket>(nango, config)) {
            const uniqueTickets = results.filter((ticket) => {
                const uniqueKey = `${ticket.id}-${ticket.updated_at}`;

                if (ticketCache.has(uniqueKey)) {
                    return false;
                }

                ticketCache.add(uniqueKey);
                return true;
            });

            if (uniqueTickets.length > 0) {
                const mappedTickets = mapTickets(uniqueTickets);
                await nango.batchSave(mappedTickets, 'Ticket');
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

export function mapTickets(tickets: ZendeskTicket[]): Ticket[] {
    return tickets.map((ticket) => ({
        url: 'url' in ticket ? (ticket.url ?? null) : null,
        id: ticket.id.toString(),
        external_id: 'external_id' in ticket ? (ticket.external_id ?? null) : null,
        via: 'via' in ticket ? (ticket.via ?? null) : null,
        created_at: 'created_at' in ticket ? (new Date(ticket.created_at).toISOString() ?? null) : null,
        updated_at: 'updated_at' in ticket ? (new Date(ticket.updated_at).toISOString() ?? null) : null,
        generated_timestamp: 'generated_timestamp' in ticket ? (ticket.generated_timestamp ?? null) : null,
        type: 'type' in ticket ? (ticket.type ?? null) : null,
        subject: ticket.subject ?? null,
        raw_subject: 'raw_subject' in ticket ? (ticket.raw_subject ?? null) : null,
        description: ticket.description ?? null,
        priority: 'priority' in ticket ? (ticket.priority ?? null) : null,
        status: 'status' in ticket ? (ticket.status ?? null) : null,
        recipient: 'recipient' in ticket ? (ticket.recipient ?? null) : null,
        requester_id: 'requester_id' in ticket ? (ticket.requester_id ?? null) : null,
        submitter_id: 'submitter_id' in ticket ? (ticket.submitter_id ?? null) : null,
        assignee_id: 'assignee_id' in ticket ? (ticket.assignee_id ?? null) : null,
        organization_id: 'organization_id' in ticket ? (ticket.organization_id ?? null) : null,
        group_id: 'group_id' in ticket ? (ticket.group_id ?? null) : null,
        collaborator_ids: 'collaborator_ids' in ticket ? (ticket.collaborator_ids ?? null) : null,
        follower_ids: 'follower_ids' in ticket ? (ticket.follower_ids ?? null) : null,
        email_cc_ids: 'email_cc_ids' in ticket ? (ticket.email_cc_ids ?? null) : null,
        forum_topic_id: 'forum_topic_id' in ticket ? (ticket.forum_topic_id ?? null) : null,
        problem_id: 'problem_id' in ticket ? (ticket.problem_id ?? null) : null,
        has_incidents: 'has_incidents' in ticket ? (ticket.has_incidents ?? null) : null,
        is_public: 'is_public' in ticket ? (ticket.is_public ?? null) : null,
        due_at: 'due_at' in ticket ? (ticket.due_at ? new Date(ticket.due_at).toISOString() : null) : null,
        tags: 'tags' in ticket ? (ticket.tags ?? null) : null,
        custom_fields: 'custom_fields' in ticket ? (ticket.custom_fields ?? null) : null,
        satisfaction_rating: 'satisfaction_rating' in ticket ? (ticket.satisfaction_rating ?? null) : null,
        sharing_agreement_ids: 'sharing_agreement_ids' in ticket ? (ticket.sharing_agreement_ids ?? null) : null,
        custom_status_id: 'custom_status_id' in ticket ? (ticket.custom_status_id ?? null) : null,
        fields: 'fields' in ticket ? (ticket.fields ?? null) : null,
        followup_ids: 'followup_ids' in ticket ? (ticket.followup_ids ?? null) : null,
        ticket_form_id: 'ticket_form_id' in ticket ? (ticket.ticket_form_id ?? null) : null,
        brand_id: 'brand_id' in ticket ? (ticket.brand_id ?? null) : null,
        allow_channelback: 'allow_channelback' in ticket ? (ticket.allow_channelback ?? null) : null,
        allow_attachments: 'allow_attachments' in ticket ? (ticket.allow_attachments ?? null) : null,
        from_messaging_channel: 'from_messaging_channel' in ticket ? (ticket.from_messaging_channel ?? null) : null
    }));
}
