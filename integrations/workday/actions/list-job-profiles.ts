import { z } from 'zod';
import { createAction } from 'nango';
import soap from 'soap';

const WORKDAY_VERSION = '44.0';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Page number for pagination (1-based). Omit for the first page.')
});

const JobProfileSchema = z.object({
    id: z.string(),
    name: z.string(),
    reference_id: z.string().optional(),
    inactive: z.boolean(),
    description: z.string().optional(),
    effective_date: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(JobProfileSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List job profiles from Workday.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-job-profiles',
        group: 'Job Profiles'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const { credentials, connection_config } = connection;

        if (
            credentials?.type !== 'BASIC' ||
            !credentials?.username ||
            !credentials?.password ||
            !connection_config?.['hostname'] ||
            !connection_config?.['tenant']
        ) {
            throw new Error('Invalid credentials: BASIC auth, username, password, hostname, and tenant are all required.');
        }

        const wsdlUrl = `https://community.workday.com/sites/default/files/file-hosting/productionapi/Human_Resources/v${WORKDAY_VERSION}/Human_Resources.wsdl`;
        const endpointUrl = `https://${connection_config['hostname']}/ccx/service/${connection_config['tenant']}/Human_Resources/v${WORKDAY_VERSION}`;

        const client = await soap.createClientAsync(wsdlUrl, {});
        client.addHttpHeader('Accept-Encoding', 'gzip, deflate');
        client.setSecurity(new soap.WSSecurity(credentials.username, credentials.password));
        client.setEndpoint(endpointUrl);

        const findId = (ids: any, type: string): string | undefined =>
            (Array.isArray(ids) ? ids : [ids]).find((r: any) => r?.attributes?.['wd:type'] === type)?.$value;

        const items: z.infer<typeof JobProfileSchema>[] = [];
        let page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (isNaN(page) || page < 1) {
            page = 1;
        }

        // https://community.workday.com/sites/default/files/file-hosting/productionapi/Human_Resources/v44.0/Get_Job_Profiles.html
        const [res]: [any, string] = await client['Get_Job_ProfilesAsync']({
            Response_Filter: {
                Page: page,
                Count: 100
            }
        });

        const jobProfiles = res?.Response_Data?.Job_Profile ?? [];

        for (const profile of jobProfiles) {
            const data = profile.Job_Profile_Data;
            if (!data) {
                continue;
            }

            const inactive = data?.Inactive === '1' || data?.Inactive === true;

            items.push({
                id: findId(profile.Job_Profile_Reference?.ID, 'WID') ?? '',
                name: data?.Name ?? '',
                reference_id: findId(profile.Job_Profile_Reference?.ID, 'Job_Profile_ID'),
                inactive: inactive,
                description: data?.Description ?? undefined,
                effective_date: data?.Effective_Date ?? undefined
            });
        }

        const totalPages = res?.Response_Results?.Total_Pages ?? page;
        const hasMoreData = page < totalPages;

        const result: z.infer<typeof OutputSchema> = { items };
        if (hasMoreData) {
            result.next_cursor = String(page + 1);
        }
        return result;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
