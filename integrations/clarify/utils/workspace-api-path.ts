interface ClarifyActionNango {
    getConnection(): Promise<{ connection_config: Record<string, string> }>;
    ActionError: new (payload: { message: string }) => Error;
}

export async function getWorkspaceApiBase(nango: ClarifyActionNango): Promise<string> {
    const connection = await nango.getConnection();
    const slug = connection.connection_config['workspaceSlug'];

    if (typeof slug !== 'string' || slug.length === 0) {
        throw new nango.ActionError({
            message: 'Missing workspaceSlug in connection configuration'
        });
    }

    return `/v1/workspaces/${encodeURIComponent(slug)}`;
}
