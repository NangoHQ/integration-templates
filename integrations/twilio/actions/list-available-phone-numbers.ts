import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    country_code: z.string().describe('ISO-3166-1 alpha-2 country code. Example: "US"'),
    type: z.enum(['Local', 'TollFree', 'Mobile']).describe('Type of phone number to search for'),
    area_code: z.number().optional().describe('Area code for US and Canada numbers'),
    contains: z.string().optional().describe('Matching pattern to identify phone numbers'),
    sms_enabled: z.boolean().optional().describe('Whether the phone numbers can receive text messages'),
    mms_enabled: z.boolean().optional().describe('Whether the phone numbers can receive MMS messages'),
    voice_enabled: z.boolean().optional().describe('Whether the phone numbers can receive calls'),
    fax_enabled: z.boolean().optional().describe('Whether the phone numbers can receive faxes'),
    exclude_all_address_required: z.boolean().optional().describe('Whether to exclude phone numbers that require an Address'),
    exclude_local_address_required: z.boolean().optional().describe('Whether to exclude phone numbers that require a local Address'),
    exclude_foreign_address_required: z.boolean().optional().describe('Whether to exclude phone numbers that require a foreign Address'),
    beta: z.boolean().optional().describe('Whether to read phone numbers that are new to the Twilio platform'),
    near_number: z.string().optional().describe('Given a phone number, find a geographically close number'),
    near_lat_long: z.string().optional().describe('Given a latitude/longitude pair, find geographically close numbers'),
    distance: z.number().optional().describe('Search radius in miles for a near query. Default is 25, max is 500'),
    in_postal_code: z.string().optional().describe('Limit results to a particular postal code'),
    in_region: z.string().optional().describe('Limit results to a particular region, state, or province'),
    in_rate_center: z.string().optional().describe('Limit results to a specific rate center'),
    in_lata: z.string().optional().describe('Limit results to a specific LATA'),
    in_locality: z.string().optional().describe('Limit results to a particular locality or city'),
    page_size: z.number().optional().describe('How many resources to return in each list page. Default is 50, max is 1000'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Pass the next_page_uri value.')
});

const ProviderCapabilitiesSchema = z
    .object({
        MMS: z.boolean().optional(),
        SMS: z.boolean().optional(),
        voice: z.boolean().optional(),
        fax: z.boolean().optional()
    })
    .passthrough();

const ProviderAvailablePhoneNumberSchema = z
    .object({
        address_requirements: z.string().optional().nullable(),
        beta: z.boolean().optional().nullable(),
        capabilities: ProviderCapabilitiesSchema.optional().nullable(),
        friendly_name: z.string().optional().nullable(),
        iso_country: z.string().optional().nullable(),
        lata: z.string().optional().nullable(),
        latitude: z.string().optional().nullable(),
        locality: z.string().optional().nullable(),
        longitude: z.string().optional().nullable(),
        phone_number: z.string().optional().nullable(),
        postal_code: z.string().optional().nullable(),
        rate_center: z.string().optional().nullable(),
        region: z.string().optional().nullable()
    })
    .passthrough();

const ProviderResponseSchema = z
    .object({
        available_phone_numbers: z.array(ProviderAvailablePhoneNumberSchema).optional().nullable(),
        next_page_uri: z.string().optional().nullable(),
        page: z.number().optional().nullable(),
        page_size: z.number().optional().nullable(),
        uri: z.string().optional().nullable()
    })
    .passthrough();

const CapabilitiesSchema = z.object({
    mms: z.boolean().optional(),
    sms: z.boolean().optional(),
    voice: z.boolean().optional(),
    fax: z.boolean().optional()
});

const AvailablePhoneNumberSchema = z.object({
    address_requirements: z.string().optional(),
    beta: z.boolean().optional(),
    capabilities: CapabilitiesSchema.optional(),
    friendly_name: z.string().optional(),
    iso_country: z.string().optional(),
    lata: z.string().optional(),
    latitude: z.string().optional(),
    locality: z.string().optional(),
    longitude: z.string().optional(),
    phone_number: z.string().optional(),
    postal_code: z.string().optional(),
    rate_center: z.string().optional(),
    region: z.string().optional()
});

const OutputSchema = z.object({
    available_phone_numbers: z.array(AvailablePhoneNumberSchema),
    next_page_uri: z.string().optional()
});

const action = createAction({
    description: 'Search Twilio available phone numbers',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-available-phone-numbers'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        const metadata = z.object({ account_sid: z.string() }).parse(await nango.getMetadata());
        const accountSid = metadata.account_sid;

        const params: Record<string, string | number> = {};

        if (input.area_code !== undefined) {
            params['AreaCode'] = input.area_code;
        }
        if (input.contains !== undefined) {
            params['Contains'] = input.contains;
        }
        if (input.sms_enabled !== undefined) {
            params['SmsEnabled'] = String(input.sms_enabled);
        }
        if (input.mms_enabled !== undefined) {
            params['MmsEnabled'] = String(input.mms_enabled);
        }
        if (input.voice_enabled !== undefined) {
            params['VoiceEnabled'] = String(input.voice_enabled);
        }
        if (input.fax_enabled !== undefined) {
            params['FaxEnabled'] = String(input.fax_enabled);
        }
        if (input.exclude_all_address_required !== undefined) {
            params['ExcludeAllAddressRequired'] = String(input.exclude_all_address_required);
        }
        if (input.exclude_local_address_required !== undefined) {
            params['ExcludeLocalAddressRequired'] = String(input.exclude_local_address_required);
        }
        if (input.exclude_foreign_address_required !== undefined) {
            params['ExcludeForeignAddressRequired'] = String(input.exclude_foreign_address_required);
        }
        if (input.beta !== undefined) {
            params['Beta'] = String(input.beta);
        }
        if (input.near_number !== undefined) {
            params['NearNumber'] = input.near_number;
        }
        if (input.near_lat_long !== undefined) {
            params['NearLatLong'] = input.near_lat_long;
        }
        if (input.distance !== undefined) {
            params['Distance'] = input.distance;
        }
        if (input.in_postal_code !== undefined) {
            params['InPostalCode'] = input.in_postal_code;
        }
        if (input.in_region !== undefined) {
            params['InRegion'] = input.in_region;
        }
        if (input.in_rate_center !== undefined) {
            params['InRateCenter'] = input.in_rate_center;
        }
        if (input.in_lata !== undefined) {
            params['InLata'] = input.in_lata;
        }
        if (input.in_locality !== undefined) {
            params['InLocality'] = input.in_locality;
        }
        if (input.page_size !== undefined) {
            params['PageSize'] = input.page_size;
        }
        if (input.cursor !== undefined) {
            params['Page'] = input.cursor;
        }

        const response = await nango.get({
            // https://www.twilio.com/docs/phone-numbers/api/availablephonenumberlocal-resource
            endpoint: `/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/AvailablePhoneNumbers/${encodeURIComponent(input.country_code)}/${encodeURIComponent(input.type)}.json`,
            params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const availablePhoneNumbers = (providerResponse.available_phone_numbers || []).map((item) => {
            const capabilities = item.capabilities || {};
            const normalizedCapabilities = {
                ...(capabilities.MMS !== undefined && { mms: capabilities.MMS }),
                ...(capabilities.SMS !== undefined && { sms: capabilities.SMS }),
                ...(capabilities.voice !== undefined && { voice: capabilities.voice }),
                ...(capabilities.fax !== undefined && { fax: capabilities.fax })
            };

            return {
                ...(item.address_requirements != null && { address_requirements: item.address_requirements }),
                ...(item.beta != null && { beta: item.beta }),
                ...(Object.keys(normalizedCapabilities).length > 0 && { capabilities: normalizedCapabilities }),
                ...(item.friendly_name != null && { friendly_name: item.friendly_name }),
                ...(item.iso_country != null && { iso_country: item.iso_country }),
                ...(item.lata != null && { lata: item.lata }),
                ...(item.latitude != null && { latitude: item.latitude }),
                ...(item.locality != null && { locality: item.locality }),
                ...(item.longitude != null && { longitude: item.longitude }),
                ...(item.phone_number != null && { phone_number: item.phone_number }),
                ...(item.postal_code != null && { postal_code: item.postal_code }),
                ...(item.rate_center != null && { rate_center: item.rate_center }),
                ...(item.region != null && { region: item.region })
            };
        });

        return {
            available_phone_numbers: availablePhoneNumbers,
            ...(providerResponse.next_page_uri != null && { next_page_uri: providerResponse.next_page_uri })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
