import type { GithubMember, NangoSync } from '../../models';
import { GHOST_MEMBER, GithubConstants } from '../constants';
import type { UserFields } from '../types';
import { toUser } from './to-user';

export async function toMember(identifiers: string, nango: NangoSync, user: UserFields | null): Promise<GithubMember> {
    if (!user) {
        await nango.log(`User is null, returning ghost member for ${identifiers}.`, { level: 'debug' });

        return GHOST_MEMBER;
    }

    const member = {
        displayName: user?.login ?? '',
        identities: [
            {
                platform: GithubConstants.github,
                type: GithubConstants.username,
                verified: true,
                value: user?.login ?? '',
                sourceId: user?.databaseId?.toString() ?? ''
            }
        ],
        attributes: toUser(user)
    };

    return member;
}
