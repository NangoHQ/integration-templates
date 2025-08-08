import type { NangoAction, ProxyConfiguration } from 'nango';
import type { JiraIssueMetadata } from '../models.js';
import type { JiraAccessibleResource } from '../types.js';

/**
 * Retrieves the cloud ID and base URL for the Jira instance from the Nango connection configuration or metadata.
 * If not available, makes a request to get the accessible resources, updates the metadata, and returns the cloud ID and base URL.
 *
 * @param {NangoAction} nango - The NangoAction instance for handling synchronization tasks.
 * @returns {Promise<{ cloudId: string, baseUrl: string }>} - The cloud ID and base URL for the Jira instance.
 * @throws {Error} - Throws an error if the accessible resources are not found or the cloud ID/base URL cannot be retrieved.
 */
export async function getCloudData(nango: NangoAction<typeof JiraIssueMetadata>): Promise<{ cloudId: string; baseUrl: string }> {
    const connection = await nango.getConnection();
    const metadata = await nango.getMetadata<JiraIssueMetadata>();

    const cloudId = connection.connection_config['cloudId'] ?? metadata?.cloudId;
    const baseUrl = connection.connection_config['baseUrl'] ?? metadata?.baseUrl;

    if (cloudId && baseUrl) {
        return { cloudId, baseUrl };
    }

    const config: ProxyConfiguration = {
        // https://developer.atlassian.com/cloud/confluence/oauth-2-3lo-apps/
        endpoint: `oauth/token/accessible-resources`,
        retries: 10
    };

    const response = await nango.get<JiraAccessibleResource[]>(config);

    if (!response.data || response.data.length === 0) {
        throw new Error('Failed to retrieve accessible resources.');
    }

    const resource = response.data[0];
    if (!resource) {
        throw new Error('Failed to retrieve cloudId or baseUrl from accessible resources.');
    }

    const { id: newCloudId, url: newBaseUrl } = resource;

    await nango.updateMetadata({
        ...metadata,
        cloudId: newCloudId,
        baseUrl: newBaseUrl
    });

    return { cloudId: newCloudId, baseUrl: newBaseUrl };
}
