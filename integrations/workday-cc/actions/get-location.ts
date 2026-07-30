import { z } from 'zod';
import { createAction } from 'nango';

const STAFFING_API_VERSION = 'v6';

const InputSchema = z.object({
    id: z.string().describe('Location ID. Example: "San_Francisco_Site"')
});

// Workday's Staffing REST API has no dedicated Location master-data resource (no /locations
// collection or /locations/{id}). The closest available substitute is the "prompt values" endpoint
// used to populate the location field on job change transactions, filtered down to a single ID.
// It only exposes id/descriptor — location code, usage, and inactive status aren't available here.
const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    location_code: z.string().optional(),
    location_usage: z.string().optional(),
    inactive: z.boolean().optional()
});

const ProviderLocationValueSchema = z.object({
    id: z.string(),
    descriptor: z.string().optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderLocationValueSchema).optional(),
    total: z.number().optional()
});

const action = createAction({
    description: 'Retrieve a single location from Workday.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const tenant = connection.connection_config['tenant'];

        // https://community.workday.com/sites/default/files/file-hosting/restapi/index.html#staffing/v6/values~jobChangesGroup~locations
        const response = await nango.get({
            endpoint: `/staffing/${STAFFING_API_VERSION}/${tenant}/values/jobChangesGroup/locations`,
            params: { location: input.id },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const location = providerResponse.data?.find((item) => item.id === input.id) ?? providerResponse.data?.[0];

        if (!location) {
            throw new nango.ActionError({ type: 'not_found', message: `Location not found: ${input.id}` });
        }

        return {
            id: location.id,
            name: location.descriptor ?? ''
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
