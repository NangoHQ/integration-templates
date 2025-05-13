import type { TeamMemberUser } from '../../models';
import type { GemTeamUser } from '../types';

export function toUser(response: GemTeamUser): TeamMemberUser {
    return {
        id: response.id,
        name: response.name,
        email: response.email
    };
}
