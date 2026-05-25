import { z } from 'zod';
import { createAction } from 'nango';
import soap from 'soap';

const WORKDAY_VERSION = '44.0';

const InputSchema = z.object({
    id: z.string().describe('Job_Profile_ID. Example: "JOB_PROFILE_001"')
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    inactive: z.boolean().optional(),
    job_family: z.string().optional(),
    management_level: z.string().optional(),
    job_category: z.string().optional(),
    reference_id: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single job profile from Workday.',
    version: '1.0.0',
    endpoint: { method: 'GET', path: '/actions/get-job-profile', group: 'Job Profiles' },
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

        const findId = (ids: any, type: string): string | undefined =>
            (Array.isArray(ids) ? ids : [ids]).find((r: any) => r?.attributes?.['wd:type'] === type)?.$value;

        // https://community.workday.com/sites/default/files/file-hosting/productionapi/Human_Resources/v44.0/Get_Job_Profiles.html
        const [res]: [any, string] = await client['Get_Job_ProfilesAsync']({
            Request_References: {
                Job_Profile_Reference: {
                    ID: {
                        attributes: { 'wd:type': 'Job_Profile_ID' },
                        $value: input.id
                    }
                }
            }
        });

        const jobProfile = res?.Response_Data?.Job_Profile?.[0];
        if (!jobProfile) {
            throw new nango.ActionError({ type: 'not_found', message: `Job Profile not found: ${input.id}` });
        }

        const data = jobProfile.Job_Profile_Data;

        return {
            id: findId(jobProfile.Job_Profile_Reference?.ID, 'Job_Profile_ID') ?? input.id,
            name: data?.Job_Profile_Name ?? '',
            description: data?.Job_Profile_Summary ?? undefined,
            inactive: data?.Inactive === '1' || data?.Inactive === true,
            job_family: findId(data?.Job_Family_Reference?.ID, 'Job_Family_ID'),
            management_level: findId(data?.Management_Level_Reference?.ID, 'Management_Level_ID'),
            job_category: findId(data?.Job_Category_Reference?.ID, 'Job_Category_ID'),
            reference_id: findId(jobProfile.Job_Profile_Reference?.ID, 'Job_Profile_ID')
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
