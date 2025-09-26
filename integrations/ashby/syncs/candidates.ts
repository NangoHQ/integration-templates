import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { AshbyCandidate, AshbyCandidateMetadata } from '../models.js';

let nextCursor: string | null = null;

const sync = createSync({
    description: 'Fetches a list of all candidates from your ashby account',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'incremental',

    endpoints: [
        {
            method: 'GET',
            path: '/candidates',
            group: 'Candidates'
        }
    ],

    scopes: ['candidatelastsyncToken'],

    models: {
        AshbyCandidate: AshbyCandidate
    },

    metadata: AshbyCandidateMetadata,

    exec: async (nango) => {
        const metadata = (await nango.getMetadata()) || {};
        const candidatelastsyncToken = metadata['candidatelastsyncToken'] ? String(metadata['candidatelastsyncToken']) : '';

        await saveAllCandidates(nango, candidatelastsyncToken);
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

async function saveAllCandidates(nango: NangoSyncLocal, candidatelastsyncToken: string) {
    let totalRecords = 0;

    // eslint-disable-next-line @nangohq/custom-integrations-linting/no-while-true
    while (true) {
        const payload: ProxyConfiguration = {
            // https://developers.ashbyhq.com/reference/candidatelist
            endpoint: '/candidate.list',
            data: {
                ...(candidatelastsyncToken && { syncToken: candidatelastsyncToken }),
                cursor: nextCursor,
                limit: 100
            },
            retries: 10
        };
        const response = await nango.post(payload);
        const pageData = response.data.results;
        const mappedCandidates: AshbyCandidate[] = mapCandidate(pageData);
        if (mappedCandidates.length > 0) {
            const batchSize: number = mappedCandidates.length;
            totalRecords += batchSize;
            await nango.batchSave(mappedCandidates, 'AshbyCandidate');
            await nango.log(`Saving batch of ${batchSize} candidate(s) (total candidate(s): ${totalRecords})`);
        }
        if (response.data.moreDataAvailable) {
            nextCursor = response.data.nextCursor;
        } else {
            candidatelastsyncToken = response.data.syncToken;
            break;
        }
    }

    const metadata = (await nango.getMetadata()) || {};
    metadata['candidatelastsyncToken'] = candidatelastsyncToken;
    await nango.setMetadata(metadata);
}

function mapCandidate(candidates: any[]): AshbyCandidate[] {
    return candidates.map((candidate) => ({
        id: candidate.id,
        createdAt: candidate.createdAt,
        name: candidate.name,
        primaryEmailAddress: candidate.primaryEmailAddress,
        emailAddresses: candidate.emailAddresses,
        primaryPhoneNumber: candidate.primaryPhoneNumber,
        phoneNumbers: candidate.phoneNumbers,
        socialLinks: candidate.socialLinks,
        tags: candidate.tags,
        position: candidate.position,
        company: candidate.company,
        school: candidate.school,
        applicationIds: candidate.applicationIds,
        resumeFileHandle: candidate.resumeFileHandle,
        fileHandles: candidate.fileHandles,
        customFields: candidate.customFields,
        profileUrl: candidate.profileUrl,
        source: candidate.source,
        creditedToUser: candidate.creditedToUser
    }));
}
