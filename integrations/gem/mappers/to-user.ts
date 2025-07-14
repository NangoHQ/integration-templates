import type { TeamMemberUser } from '../../models.js';
import type { GemTeamUser } from '../types.js';

export function toUser(response: GemTeamUser): TeamMemberUser {
    return {
        id: response.id,
        name: response.name,
        email: response.email
    };
}
