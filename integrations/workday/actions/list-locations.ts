import { z } from 'zod';
import { createAction } from 'nango';
import soap from 'soap';

const WORKDAY_VERSION = '44.0';

// Workday SOAP response types
type WorkdayId = {
    attributes?: { [key: string]: string };
    $value?: string;
};

type WorkdayIdArray = WorkdayId[] | WorkdayId | undefined;

type WorkdayAddress = {
    Country_Reference?: {
        ID?: WorkdayIdArray;
    };
};

type LocationData = {
    Location_Name?: string;
    Location_Usage_Reference?: {
        ID?: WorkdayIdArray;
    };
    Contact_Data?: {
        Address_Data?: WorkdayAddress[];
    };
    Inactive?: string | boolean;
};

type Location = {
    Location_Reference?: {
        ID?: WorkdayIdArray;
    };
    Location_Data?: LocationData;
};

type LocationResponse = {
    Response_Results?: {
        Total_Pages?: number;
        Page?: number;
    };
    Response_Data?: {
        Location?: Location[] | Location;
    };
};

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for first page.')
});

const LocationOutputSchema = z.object({
    id: z.string(),
    reference_id: z.string().optional(),
    name: z.string(),
    location_usage: z.string().optional(),
    country: z.string().optional(),
    inactive: z.boolean()
});

const OutputSchema = z.object({
    items: z.array(LocationOutputSchema),
    next_page: z.string().optional().describe('Next page number for pagination.')
});

const action = createAction({
    description: 'List locations from Workday with pagination support.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const { credentials, connection_config } = connection;

        if (credentials.type !== 'BASIC' || !credentials.username || !credentials.password || !connection_config['hostname'] || !connection_config['tenant']) {
            throw new Error('Invalid credentials: BASIC auth, username, password, hostname, and tenant are all required.');
        }

        const wsdlUrl = `https://community.workday.com/sites/default/files/file-hosting/productionapi/Human_Resources/v${WORKDAY_VERSION}/Human_Resources.wsdl`;
        const endpointUrl = `https://${connection_config['hostname']}/ccx/service/${connection_config['tenant']}/Human_Resources/v${WORKDAY_VERSION}`;

        const client = await soap.createClientAsync(wsdlUrl, {});
        client.addHttpHeader('Accept-Encoding', 'gzip, deflate');
        client.setSecurity(new soap.WSSecurity(credentials.username, credentials.password));
        client.setEndpoint(endpointUrl);

        const findId = (ids: WorkdayIdArray, type: string): string | undefined => {
            const idArray = Array.isArray(ids) ? ids : ids ? [ids] : [];
            return idArray.find((r) => r?.attributes?.['wd:type'] === type)?.$value;
        };

        let page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (isNaN(page) || page < 1) {
            page = 1;
        }

        // https://community.workday.com/sites/default/files/file-hosting/productionapi/Human_Resources/v44.0/Get_Locations.html
        const [res]: [LocationResponse, string] = await client['Get_LocationsAsync']({
            Response_Filter: {
                Page: page,
                Count: 100
            }
        });

        const totalPages = res?.Response_Results?.Total_Pages ?? 1;
        const currentPage = res?.Response_Results?.Page ?? page;

        const items: z.infer<typeof LocationOutputSchema>[] = [];

        if (res?.Response_Data?.Location) {
            const locations = Array.isArray(res.Response_Data.Location) ? res.Response_Data.Location : [res.Response_Data.Location];

            for (const loc of locations) {
                const data = loc.Location_Data;
                if (!data) continue;

                const id = findId(loc.Location_Reference?.ID, 'Location_ID');
                const referenceId = findId(loc.Location_Reference?.ID, 'Location_Reference_ID');

                if (!id) continue;

                const addressData = data.Contact_Data?.Address_Data?.[0];
                const countryId = addressData?.Country_Reference?.ID;
                const countryIds = Array.isArray(countryId) ? countryId : countryId ? [countryId] : [];
                const country = countryIds.find((r) => r?.attributes?.['wd:type'] === 'ISO_3166-1_Alpha-2_Code')?.$value;

                items.push({
                    id,
                    reference_id: referenceId,
                    name: data.Location_Name ?? '',
                    location_usage: findId(data.Location_Usage_Reference?.ID, 'Location_Usage_ID'),
                    country,
                    inactive: data.Inactive === '1' || data.Inactive === true
                });
            }
        }

        const hasMoreData = currentPage < totalPages;

        return {
            items,
            ...(hasMoreData && { next_page: String(currentPage + 1) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
