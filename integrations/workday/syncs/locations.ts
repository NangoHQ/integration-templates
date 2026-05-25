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

// https://community.workday.com/sites/default/files/file-hosting/productionapi/Human_Resources/v44.0/index.html

const LocationSchema = z.object({
    id: z.string(),
    name: z.string(),
    inactive: z.boolean().optional(),
    location_type: z.string().optional(),
    time_zone: z.string().optional(),
    usage: z.string().optional(),
    last_updated: z.string().optional()
});

const findId = (ids: any, type: string): string | undefined => (Array.isArray(ids) ? ids : [ids]).find((r: any) => r?.attributes?.['wd:type'] === type)?.$value;

async function getSoapClient(type: 'Human_Resources' | 'Staffing', connection: any) {
    const { credentials, connection_config } = connection;

    if (credentials.type !== 'BASIC' || !credentials.username || !credentials.password || !connection_config['hostname'] || !connection_config['tenant']) {
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

const sync = createSync({
    description: 'Sync locations from Workday.',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/locations'
        }
    ],
    models: {
        Location: LocationSchema
    },

    exec: async (nango) => {
        const connection = await nango.getConnection();
        // getSoapClient throws on invalid credentials — do this before trackDeletesStart
        const client = await getSoapClient('Human_Resources', connection);

        await nango.trackDeletesStart('Location');

        let page = 1;
        let hasMoreData = true;

        do {
            await nango.log(`Fetching page ${page}`);

            // https://community.workday.com/sites/default/files/file-hosting/productionapi/Human_Resources/v44.0/Get_Locations.html
            const [res]: [any, string] = await withRetry(() =>
                client['Get_LocationsAsync']({
                    Response_Filter: {
                        Page: page,
                        Count: 100
                    }
                })
            );

            if (!res?.Response_Results) {
                throw new Error('Unexpected Workday response: missing Response_Results');
            }
            const totalPages = res.Response_Results.Total_Pages ?? 1;
            hasMoreData = page < totalPages;
            page += 1;

            const rawLocations = res.Response_Data?.Location;
            const locationList = Array.isArray(rawLocations) ? rawLocations : rawLocations ? [rawLocations] : [];
            const locations = locationList.map((loc: any) => {
                const data = loc.Location_Data;
                const inactive = data?.Inactive === '1' || data?.Inactive === true;

                const locationId = findId(loc.Location_Reference?.ID, 'Location_ID');

                return {
                    id: locationId ?? '',
                    name: data?.Location_Name ?? '',
                    inactive: inactive,
                    location_type: findId(data?.Location_Type_Reference?.[0]?.ID, 'Location_Type_ID'),
                    time_zone: data?.Time_Profile_Reference ? findId(data.Time_Profile_Reference.ID, 'Time_Profile_ID') : undefined,
                    usage: data?.Usage_Data?.[0]?.Location_Usage_Reference
                        ? findId(data.Usage_Data[0].Location_Usage_Reference.ID, 'Location_Usage_ID')
                        : undefined,
                    last_updated: data?.Last_Updated_DateTime ?? undefined
                };
            });

            if (locations.length > 0) {
                await nango.batchSave(locations, 'Location');
            }
        } while (hasMoreData);

        await nango.trackDeletesEnd('Location');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
