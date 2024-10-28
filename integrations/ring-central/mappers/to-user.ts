import type { User } from '../../models';
import type { RingCentralUser } from '../types';

/**
 * Maps a RingCentral API user object to a Nango User object.
 *
 * @param ringCentralUser The raw contact object from the RingCentral API.
 * @returns Mapped User object with essential properties.
 */
export function toUser(ringCentralUser: RingCentralUser): User {
    return {
        id: ringCentralUser.id,
        email: ringCentralUser.emails[0]?.value || '',
        firstName: ringCentralUser.name.givenName,
        lastName: ringCentralUser.name.familyName
    };
}
