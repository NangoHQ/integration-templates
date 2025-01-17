import type { User } from '../../models';
import type { LucidUser } from '../types';

/**
 * Maps a Lucid API contact object to a Nango User object.
 *
 * @param lucidUser The raw contact object from the Lucid API.
 * @returns Mapped User object with essential properties.
 */
export function toUser(lucidUser: LucidUser): User {
    return {
        id: lucidUser.id,
        email: lucidUser.emails.find((email) => email.primary)?.value ?? '',
        firstName: lucidUser.name.givenName,
        lastName: lucidUser.name.familyName
    };
}
