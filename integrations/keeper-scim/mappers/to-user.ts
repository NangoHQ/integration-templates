import type { User } from '../../models';
// import type { IntercomContact } from '../types';

/**
 * Maps a Keeper API contact object to a Nango User object.
 *
 * @param contact The raw contact object from the Keeper API.
 * @returns Mapped User object with essential properties.
 */
export function toUser(keeperUser: any): User {
    return {
        id: keeperUser.id,
        email: keeperUser.email,
        firstName: keeperUser.firstName,
        lastName: keeperUser.lastName
    };
}
