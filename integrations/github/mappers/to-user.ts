import type { GithubMemberAttributes } from '../../models';
import { GithubConstants } from '../constants';
import type { UserFields } from '../types';

export function toUser(user: UserFields): GithubMemberAttributes {
    return {
        isHireable: user?.isHireable ?? false,
        url: `https://github.com/${user?.login ?? ''}`,
        bio: user?.bio ?? '',
        location: user?.location ?? '',
        avatarUrl: user?.avatarUrl ?? '',
        company: user?.company ?? '',
        isBot: user?.__typename === GithubConstants.bot,
        websiteUrl: user?.websiteUrl ?? ''
    };
}
