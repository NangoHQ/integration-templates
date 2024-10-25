import type { User } from '../../models';
import type { MiroUser } from '../types';

/**
 * Maps a Miro User API object to a Nango User object.
 *
 * @param miroUser The raw user object from the Miro API.
 * @returns Mapped User object with essential properties.
 */
export function toUser(miroUser: MiroUser): User {
    return {
        id: miroUser.id,
        email: miroUser.emails.find((email) => email.primary)?.value ?? '',
        firstName: miroUser.name.givenName,
        lastName: miroUser.name.familyName
    };
}
