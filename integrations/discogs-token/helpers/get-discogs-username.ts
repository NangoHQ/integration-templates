export async function getDiscogsUsername(nango: {
    get: (config: { endpoint: string; retries?: number }) => Promise<{ data?: { username?: string } }>;
}): Promise<string> {
    // https://www.discogs.com/developers#page:user-identity,header-user-identity-oauth-identity
    const identity = await nango.get({ endpoint: '/oauth/identity', retries: 3 });
    const username = identity.data?.username;
    if (!username) {
        throw new Error('Could not resolve Discogs username from /oauth/identity');
    }
    return username;
}
