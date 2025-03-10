import type { NangoSync, ProxyConfiguration } from '../../models';
import type { ExtendedGitHubUser } from '../types.js';
import { RETRIES } from '../constants.js';

export async function getUserDetail(userURL: string, nango: NangoSync, refreshToken: () => Promise<string>) {
    const config: ProxyConfiguration = {
        // https://docs.github.com/en/rest/users/users?apiVersion=2022-11-28#get-a-user
        endpoint: `${userURL.startsWith('https://github.com') ? userURL.replace('https://github.com', '/users') : userURL.replace('https://api.github.com', '')}`,
        headers: {
            'X-GitHub-Api-Version': '2022-11-28',
            accept: 'application/vnd.github+json',
            authorization: `Bearer ${await refreshToken()}`
        },
        retries: RETRIES
    };

    // @allowTryCatch
    try {
        const { data } = await nango.get<ExtendedGitHubUser>(config);
        return data;
    } catch (error: any) {
        const data: ExtendedGitHubUser = {
            bio: '',
            company: '',
            hireable: false,
            location: '',
            avatar_url: '',
            type: '',
            html_url: '',
            login: '',
            id: 0,
            node_id: '',
            gravatar_id: '',
            url: '',
            followers_url: '',
            following_url: '',
            gists_url: '',
            starred_url: '',
            subscriptions_url: '',
            organizations_url: '',
            repos_url: '',
            events_url: '',
            received_events_url: '',
            user_view_type: '',
            site_admin: false,
            name: '',
            blog: '',
            email: '',
            twitter_username: '',
            public_repos: 0,
            public_gists: 0,
            followers: 0,
            following: 0,
            created_at: '',
            updated_at: ''
        };
        await nango.log(`error ${error.message}, failed to get user`, {
            level: 'error'
        });
        return data;
    }
}
