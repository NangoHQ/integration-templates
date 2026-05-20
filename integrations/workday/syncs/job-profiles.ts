import { createSync } from 'nango';
import { z } from 'zod';
import soap from 'soap';
const WORKDAY_VERSION = '44.0';

async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
    for (let attempt = 0; attempt < retries; attempt++) {
        // @allowTryCatch
        try {
            return await fn();
        } catch (err) {
            if (attempt === retries - 1) throw err;
            await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
        }
    }
    throw new Error('unreachable');
}

async function getSoapClient(
    type: 'Human_Resources' | 'Staffing',
    connection: {
        credentials: { type?: string; username?: string; password?: string };
        connection_config: Record<string, string>;
    }
) {
    const { credentials, connection_config } = connection;

    if (
        credentials.type !== 'BASIC' ||
        credentials.username === undefined ||
        credentials.password === undefined ||
        connection_config['hostname'] === undefined ||
        connection_config['tenant'] === undefined
    ) {
        throw new Error('Invalid credentials: BASIC auth, username, password, hostname, and tenant are all required.');
    }

    const wsdlUrl = `https://community.workday.com/sites/default/files/file-hosting/productionapi/${type}/v${WORKDAY_VERSION}/${type}.wsdl`;
    const endpointUrl = `https://${connection_config['hostname']}/ccx/service/${connection_config['tenant']}/${type}/v${WORKDAY_VERSION}`;

    const client = await soap.createClientAsync(wsdlUrl, {});
    client.addHttpHeader('Accept-Encoding', 'gzip, deflate');
    client.setSecurity(new soap.WSSecurity(credentials.username, credentials.password));
    client.setEndpoint(endpointUrl);
    return client;
}

const findId = (ids: any, type: string): string | undefined => (Array.isArray(ids) ? ids : [ids]).find((r: any) => r?.attributes?.['wd:type'] === type)?.$value;

const JobProfileSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    summary: z.string().optional(),
    active: z.boolean(),
    management_level_id: z.string().optional(),
    job_level_id: z.string().optional(),
    job_family_id: z.string().optional(),
    job_category_id: z.string().optional(),
    last_updated: z.string().optional()
});

const sync = createSync({
    description: 'Sync job profiles from Workday.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        JobProfile: JobProfileSchema
    },

    endpoints: [{ method: 'POST', path: '/syncs/job-profiles' }],

    exec: async (nango) => {
        const connection = await nango.getConnection();
        // getSoapClient throws on invalid credentials — do this before trackDeletesStart
        const client = await getSoapClient('Human_Resources', connection);

        // Blocker: Get_Job_Profiles has no incremental filter; full refresh required.
        await nango.trackDeletesStart('JobProfile');

        let page = 1;
        let hasMoreData = true;

        do {
            await nango.log(`Fetching page ${page}`);

            // https://community.workday.com/sites/default/files/file-hosting/productionapi/Human_Resources/v44.0/Get_Job_Profiles.html
            const [res]: [any, string] = await withRetry(() =>
                client['Get_Job_ProfilesAsync']({
                    Response_Filter: {
                        Page: page,
                        Count: 100
                    }
                })
            );

            const totalPages = res.Response_Results?.Total_Pages ?? 1;
            hasMoreData = page < totalPages;
            page += 1;

            const rawJobProfiles = res.Response_Data?.Job_Profile;
            const jobProfiles = Array.isArray(rawJobProfiles) ? rawJobProfiles : rawJobProfiles ? [rawJobProfiles] : [];
            const mapped: z.infer<typeof JobProfileSchema>[] = [];

            for (const profile of jobProfiles) {
                const data = profile.Job_Profile_Data;
                if (!data) continue;

                const profileId = findId(profile.Job_Profile_Reference?.ID, 'Job_Profile_ID');
                if (!profileId) continue;

                mapped.push({
                    id: profileId,
                    name: data.Job_Profile_Name ?? '',
                    description: data.Job_Profile_Summary ?? undefined,
                    summary: data.Job_Description ?? undefined,
                    active: data.Active !== '0' && data.Active !== false,
                    management_level_id: findId(data.Management_Level_Reference?.ID, 'Management_Level_ID'),
                    job_level_id: findId(data.Job_Level_Reference?.ID, 'Job_Level_ID'),
                    job_family_id: findId(data.Job_Family_Reference?.ID, 'Job_Family_ID'),
                    job_category_id: findId(data.Job_Category_Reference?.ID, 'Job_Category_ID'),
                    last_updated: data.Last_Updated_DateTime ?? undefined
                });
            }

            if (mapped.length > 0) {
                await nango.batchSave(mapped, 'JobProfile');
            }
        } while (hasMoreData);

        await nango.trackDeletesEnd('JobProfile');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
