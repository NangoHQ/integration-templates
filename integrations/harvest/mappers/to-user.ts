import type { User } from '../../models';
import type { HarvestUser } from '../types';

/**
 * Maps an Harvest API user object to a Nango User object.
 *
 * @param contact The raw user object from the Harvest API.
 * @returns Mapped Nango User object with essential properties.
 */
export function toUser(harvestUser: HarvestUser): User {
    return {
        id: harvestUser.id.toString(),
        email: harvestUser.email,
        firstName: harvestUser.first_name,
        lastName: harvestUser.last_name
    };
}
