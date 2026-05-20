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

const OrganizationSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string().optional(),
    subtype: z.string().optional(),
    description: z.string().optional(),
    reference_id: z.string().optional(),
    inactive: z.boolean(),
    last_updated: z.string().optional()
});

async function getSoapClient(type: 'Human_Resources' | 'Staffing', connection: any) {
    const { credentials, connection_config } = connection;

    if (
        !credentials ||
        credentials.type !== 'BASIC' ||
        !credentials.username ||
        !credentials.password ||
        !connection_config ||
        !connection_config['hostname'] ||
        !connection_config['tenant']
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

const sync = createSync({
    description: 'Sync organizations from Workday.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'GET', path: '/syncs/organizations' }],
    models: {
        Organization: OrganizationSchema
    },

    exec: async (nango) => {
        const connection = await nango.getConnection();
        const client = await getSoapClient('Human_Resources', connection);

        // Blocker: Workday Get_Organizations does not support modified_since filtering.
        // Must do a full scan; checkpointing would cause pages 1..N-1 to never be seen
        // on resume, triggering false deletions via trackDeletesEnd.
        let page = 1;
        let hasMoreData = true;
        let trackingStarted = false;

        do {
            await nango.log(`Fetching page ${page}`);

            // https://community.workday.com/sites/default/files/file-hosting/productionapi/Human_Resources/v44.0/Get_Organizations.html
            const [res]: [any, string] = await withRetry(() =>
                client['Get_OrganizationsAsync']({
                    Response_Filter: {
                        Page: page,
                        Count: 100
                    }
                })
            );

            if (!trackingStarted) {
                if (!res?.Response_Results) {
                    throw new Error('Unexpected Workday response: missing Response_Results');
                }
                await nango.trackDeletesStart('Organization');
                trackingStarted = true;
            }

            const totalPages = res.Response_Results?.Total_Pages ?? 1;
            hasMoreData = page < totalPages;
            page += 1;

            const rawOrganizations = res.Response_Data?.Organization;
            const organizations = Array.isArray(rawOrganizations) ? rawOrganizations : rawOrganizations ? [rawOrganizations] : [];
            const mapped: z.infer<typeof OrganizationSchema>[] = [];

            for (const org of organizations) {
                const data = org.Organization_Data;
                const id = findId(org.Organization_Reference?.ID, 'Organization_Reference_ID') || findId(org.Organization_Reference?.ID, 'WID');
                if (!id) continue;
                mapped.push({
                    id,
                    name: data?.Name ?? '',
                    type: findId(data?.Organization_Type_Reference?.ID, 'Organization_Type_ID'),
                    subtype: findId(data?.Organization_Subtype_Reference?.ID, 'Organization_Subtype_ID'),
                    description: data?.Description ?? undefined,
                    reference_id: data?.Reference_ID ?? undefined,
                    inactive: data?.Inactive === '1' || data?.Inactive === true,
                    last_updated: data?.Last_Updated_DateTime ?? undefined
                });
            }

            if (mapped.length > 0) {
                await nango.batchSave(mapped, 'Organization');
            }
        } while (hasMoreData);

        await nango.trackDeletesEnd('Organization');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
