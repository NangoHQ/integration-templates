import type { User } from '../models.js';
import type { KeeperUser } from '../types.js';

/**
 * Maps a Keeper API contact object to a Nango User object.
 *
 * @param keeperUser The raw contact object from the Keeper API.
 * @returns Mapped User object with essential properties.
 */
export function toUser(keeperUser: KeeperUser): User {
    return {
        id: keeperUser.id,
        email: keeperUser.emails.find((email) => email.primary)?.value ?? '',
        firstName: keeperUser.name.givenName,
        lastName: keeperUser.name.familyName
    };
}
