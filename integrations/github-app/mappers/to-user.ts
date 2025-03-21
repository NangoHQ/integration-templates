import type { GithubUser } from '../../models';

export function toUser(user: { login: string; url: string }): GithubUser {
    return {
        id: user.login,
        url: user.url
    };
}
