import type { User } from '../../models';
import type { TrelloUser } from '../types';

/**
 * Maps a Trello SCIM API user object to a Nango User object.
 *
 * @param trelloUser The raw contact object from the Trello API.
 * @returns Mapped User object with essential properties.
 */
export function toUser(trelloUser: TrelloUser): User {
    return {
        id: trelloUser.id,
        email: trelloUser.emails[0]?.value || '',
        firstName: trelloUser.name.givenName,
        lastName: trelloUser.name.familyName
    };
}
