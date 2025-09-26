import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { LeverOpportunity } from '../models.js';
import { z } from 'zod';

const LIMIT = 100;

const sync = createSync({
    description: 'Fetches all opportunities',
    version: '1.0.0',
    frequency: 'every 6 hours',
    autoStart: true,
    syncType: 'incremental',

    endpoints: [
        {
            method: 'GET',
            path: '/opportunities',
            group: 'Opportunities'
        }
    ],

    scopes: ['opportunities:read:admin'],

    models: {
        LeverOpportunity: LeverOpportunity
    },

    metadata: z.object({}),

    exec: async (nango) => {
        let totalRecords = 0;

        const config: ProxyConfiguration = {
            ...(nango.lastSyncDate ? { params: { created_at_start: nango.lastSyncDate.getTime() } } : {}),
            // https://hire.lever.co/developer/documentation#list-all-opportunities
            endpoint: '/v1/opportunities',
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'next',
                cursor_name_in_request: 'offset',
                limit_name_in_request: 'limit',
                response_path: 'data',
                limit: LIMIT
            }
        };
        for await (const opportunity of nango.paginate(config)) {
            const mappedOpportunity: LeverOpportunity[] = opportunity.map(mapOpportunity) || [];

            const batchSize: number = mappedOpportunity.length;
            totalRecords += batchSize;
            await nango.log(`Saving batch of ${batchSize} opportunities (total opportunities: ${totalRecords})`);
            await nango.batchSave(mappedOpportunity, 'LeverOpportunity');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

function mapOpportunity(opportunity: any): LeverOpportunity {
    return {
        id: opportunity.id,
        name: opportunity.name,
        headline: opportunity.headline,
        contact: opportunity.contact,
        emails: opportunity.emails,
        phones: opportunity.phones,
        confidentiality: opportunity.confidentiality,
        location: opportunity.location,
        links: opportunity.links,
        archived: opportunity.archived,
        createdAt: opportunity.createdAt,
        updatedAt: opportunity.updatedAt,
        lastInteractionAt: opportunity.lastInteractionAt,
        lastAdvancedAt: opportunity.lastAdvancedAt,
        snoozedUntil: opportunity.snoozedUntil,
        archivedAt: opportunity.archivedAt,
        archiveReason: opportunity.archiveReason,
        stage: opportunity.stage,
        stageChanges: opportunity.stageChanges,
        owner: opportunity.owner,
        tags: opportunity.tags,
        sources: opportunity.sources,
        origin: opportunity.origin,
        sourcedBy: opportunity.sourcedBy,
        applications: opportunity.applications,
        resume: opportunity.resume,
        followers: opportunity.followers,
        urls: opportunity.urls,
        dataProtection: opportunity.dataProtection,
        isAnonymized: opportunity.isAnonymized,
        opportunityLocation: opportunity.opportunityLocation
    };
}
