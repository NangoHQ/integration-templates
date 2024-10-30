import type { User } from '../../models';
import type { TrelloUser } from '../types';

/**
 * Maps a Trello API user object to a Nango User object.
 *
 * @param trelloUser The raw contact object from the Trello API.
 * @returns Mapped User object with essential properties.
 */
export function toUser(trelloUser: TrelloUser): User {
    const [firstName, lastName] = trelloUser.name.split(' ');

    return {
        id: trelloUser.accountId,
        email: trelloUser.emailAddress,
        firstName,
        lastName
    };
}
