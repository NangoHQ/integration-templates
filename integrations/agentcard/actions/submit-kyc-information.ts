import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_id: z.string().describe('The connected user id. Example: "user_7g8h9i"'),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    date_of_birth: z.string().optional().describe('ISO 8601 date, YYYY-MM-DD.'),
    national_id_number: z.string().optional(),
    phone_number: z.string().optional().describe('E.164 format with country code. Example: "+15551234567"'),
    address_line1: z.string().optional(),
    address_line2: z.string().optional(),
    address_city: z.string().optional(),
    address_region: z.string().optional().describe('State, province, or region.'),
    address_postal_code: z.string().optional(),
    address_country: z.string().optional().describe('ISO 3166-1 alpha-2 country code. Example: "US"')
});

const ProviderKycStateSchema = z.object({
    object: z.string(),
    status: z.string(),
    required_fields: z.array(z.string()).optional(),
    iframe_url: z.string().optional(),
    warnings: z.array(z.string()).optional(),
    extracted: z.record(z.string(), z.string()).optional(),
    reason: z.string().optional()
});

const OutputSchema = z.object({
    object: z.string(),
    status: z.string(),
    required_fields: z.array(z.string()).optional(),
    iframe_url: z.string().optional(),
    warnings: z.array(z.string()).optional(),
    extracted: z.record(z.string(), z.string()).optional(),
    reason: z.string().optional()
});

const action = createAction({
    description: 'Submit the extra identity fields Agentcard requests after document upload.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            user_id: input.user_id
        };

        if (input.first_name !== undefined) {
            body['first_name'] = input.first_name;
        }
        if (input.last_name !== undefined) {
            body['last_name'] = input.last_name;
        }
        if (input.date_of_birth !== undefined) {
            body['date_of_birth'] = input.date_of_birth;
        }
        if (input.national_id_number !== undefined) {
            body['national_id_number'] = input.national_id_number;
        }
        if (input.phone_number !== undefined) {
            body['phone_number'] = input.phone_number;
        }
        if (input.address_line1 !== undefined) {
            body['address_line1'] = input.address_line1;
        }
        if (input.address_line2 !== undefined) {
            body['address_line2'] = input.address_line2;
        }
        if (input.address_city !== undefined) {
            body['address_city'] = input.address_city;
        }
        if (input.address_region !== undefined) {
            body['address_region'] = input.address_region;
        }
        if (input.address_postal_code !== undefined) {
            body['address_postal_code'] = input.address_postal_code;
        }
        if (input.address_country !== undefined) {
            body['address_country'] = input.address_country;
        }

        const response = await nango.post({
            // https://docs.agentcard.sh/api-reference/kyc/submit-information
            endpoint: '/api/v2/kyc/information',
            data: body,
            retries: 3
        });

        const kycState = ProviderKycStateSchema.parse(response.data);

        return {
            object: kycState.object,
            status: kycState.status,
            ...(kycState.required_fields !== undefined && { required_fields: kycState.required_fields }),
            ...(kycState.iframe_url !== undefined && { iframe_url: kycState.iframe_url }),
            ...(kycState.warnings !== undefined && { warnings: kycState.warnings }),
            ...(kycState.extracted !== undefined && { extracted: kycState.extracted }),
            ...(kycState.reason !== undefined && { reason: kycState.reason })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
