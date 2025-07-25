import type { Contact } from '../../models.js';
import type { IntercomContact } from '../types.js';

/**
 * Maps an Intercom API contact object to an Contact object.
 *
 * @param contact The raw contact object from the Intercom API.
 * @returns Mapped Contact object with essential properties.
 */
export function toContact(contact: IntercomContact): Contact {
    return {
        id: contact.id,
        workspace_id: contact.workspace_id,
        external_id: contact.external_id,
        type: contact.role,
        email: contact.email,
        phone: contact.phone,
        name: contact.name,
        created_at: new Date(contact.created_at * 1000).toISOString(),
        updated_at: new Date(contact.updated_at * 1000).toISOString(),
        last_seen_at: contact.last_seen_at ? new Date(contact.last_seen_at * 1000).toISOString() : null,
        last_replied_at: contact.last_replied_at ? new Date(contact.last_replied_at * 1000).toISOString() : null
    };
}
