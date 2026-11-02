import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z
    .object({
        organizationIdOrSlug: z.string().min(1).describe('Organization ID or slug containing the issue that defines this dataset.'),
        issueId: z.string().min(1).describe('Opaque Sentry issue ID whose custom external associations form the dataset.')
    })
    .describe('Configuration selecting the single Sentry issue whose custom integration external issue associations form this dataset.');

const CustomExternalIssueLinkSchema = z
    .object({
        id: z.string().describe('Sentry custom external issue association ID.'),
        issueId: z.string().describe('Sentry issue ID associated with the external issue.'),
        serviceType: z.string().describe('Provider-defined external service type.'),
        displayName: z.string().describe('Human-readable external issue label.'),
        webUrl: z.string().describe('Canonical external issue web URL, retaining exact provider text.')
    })
    .describe('A custom integration external issue association for one configured Sentry issue.');

// Internal schema for items returned by GET /api/0/organizations/{organization_id_or_slug}/issues/{issue_id}/external-issues/
// All five fields are non-nullable strings in the provider serializer.
const ProviderExternalIssueSchema = z.object({
    id: z.string(),
    issueId: z.string(),
    serviceType: z.string(),
    displayName: z.string(),
    webUrl: z.string()
});

const sync = createSync({
    description: 'Make the custom integration external issue associations for one configured Sentry issue available as records.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    models: {
        CustomExternalIssueLink: CustomExternalIssueLinkSchema
    },
    scopes: ['event:read', 'event:write', 'event:admin'],

    exec: async (nango) => {
        const metadata = MetadataSchema.parse(await nango.getMetadata());

        // Full refresh with delete detection: this endpoint returns the current associations for the
        // configured issue and offers no changed-since filter, so every run re-reads the associations
        // and records whose associations disappeared upstream are removed.
        await nango.trackDeletesStart('CustomExternalIssueLink');

        // Sentry paginates through the Link header; the endpoint documents `cursor` as its only
        // pagination parameter and no page-size parameter, so no limit is sent.
        // https://docs.sentry.io/api/integration/retrieve-custom-integration-issue-links-for-the-given-sentry-issue/
        const proxyConfig: ProxyConfiguration = {
            // https://docs.sentry.io/api/integration/retrieve-custom-integration-issue-links-for-the-given-sentry-issue/
            endpoint: `/0/organizations/${encodeURIComponent(metadata.organizationIdOrSlug)}/issues/${encodeURIComponent(metadata.issueId)}/external-issues/`,
            paginate: {
                type: 'link',
                link_rel_in_response_header: 'next'
            },
            retries: 3
        };

        for await (const batch of nango.paginate<unknown>(proxyConfig)) {
            // Throw on parse failure: skipping a malformed record inside a delete-tracked scan
            // would falsely mark it as deleted.
            const links = z.array(ProviderExternalIssueSchema).parse(batch);

            if (links.length === 0) {
                continue;
            }

            await nango.batchSave(links, 'CustomExternalIssueLink');
            break;
        }

        await nango.trackDeletesEnd('CustomExternalIssueLink');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
