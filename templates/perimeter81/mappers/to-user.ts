import type { User } from '../models.js';
import type { Perimeter81User } from '../types.js';

/**
 * Maps a Perimeter81 API user object to a Nango User object.
 *
 * @param perimeter81User The raw contact object from the Perimeter81 API.
 * @returns Mapped User object with essential properties.
 */
export function toUser(perimeter81User: Perimeter81User): User {
    return {
        id: perimeter81User.id,
        email: perimeter81User.email,
        firstName: perimeter81User.firstName,
        lastName: perimeter81User.lastName
    };
}
