import type { NangoAction, NangoSync } from 'nango';

// The developer token lives in connection_config (set once per integration via
// integrations_config_defaults, not per end user - see connection_config.developer_token in
// providers.yaml). Centralized here so the type check (string, not just truthy) can't drift
// between the ~30 google-ads actions/syncs that all need this same value.
export async function getDeveloperToken(nango: NangoAction | NangoSync): Promise<string | null> {
    const connection = await nango.getConnection();
    const developerToken = connection.connection_config?.['developer_token'];
    return typeof developerToken === 'string' && developerToken.length > 0 ? developerToken : null;
}
