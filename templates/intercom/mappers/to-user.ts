import type { User } from ../models.js;
import type { IntercomContact, IntercomAdminUser } from '../types.js';

/**
 * Maps an Intercom API contact object to a Nango User object.
 *
 * @param contact The raw contact object from the Intercom API.
 * @returns Mapped User object with essential properties.
 */
export function toUser(contact: IntercomContact | IntercomAdminUser): User {
    const [firstName = '', lastName = ''] = (contact?.name ?? '').split(' ');

    return {
        id: contact.id,
        email: contact.email,
        firstName,
        lastName
    };
}
