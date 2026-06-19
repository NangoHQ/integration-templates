import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (odata.nextLink) from the previous response. Omit for the first page.')
});

// Microsoft Graph Device resource: https://learn.microsoft.com/en-us/graph/api/resources/device
const DeviceSchema = z.object({
    id: z.string().describe('The unique identifier for the device.'),
    deviceId: z.string().optional().describe('The device ID.'),
    displayName: z.string().optional().describe('The display name for the device.'),
    operatingSystem: z.string().optional().describe('The operating system of the device.'),
    operatingSystemVersion: z.string().optional().describe('The operating system version of the device.'),
    accountEnabled: z.boolean().optional().describe('Whether the device account is enabled.'),
    approximateLastSignInDateTime: z.string().optional().describe('The timestamp of the approximate last sign-in.'),
    enrollmentProfileName: z.string().nullable().optional().describe('The enrollment profile name.'),
    managementType: z.string().nullable().optional().describe('The device management type.'),
    registrationDateTime: z.string().optional().describe('The timestamp when the device was registered.'),
    deviceOwnership: z.string().nullable().optional().describe('The ownership of the device.'),
    domainName: z.string().nullable().optional().describe('The domain name.'),
    profileType: z.string().nullable().optional().describe('The profile type of the device.'),
    mdmAppId: z.string().nullable().optional().describe('The MDM application ID.'),
    complianceExpirationDateTime: z.string().nullable().optional().describe('The compliance expiration timestamp.'),
    onPremisesSyncEnabled: z.boolean().nullable().optional().describe('Whether on-premises sync is enabled.'),
    trustType: z.string().nullable().optional().describe('The trust type of the device.'),
    alternativeSecurityIds: z.array(z.record(z.string(), z.unknown())).optional().describe('Alternative security IDs for the device.')
});

const OutputSchema = z.object({
    devices: z.array(DeviceSchema),
    next_cursor: z.string().optional().describe('The odata.nextLink cursor for the next page of results.')
});

// Raw response from Microsoft Graph /v1.0/devices
const ProviderDevicesResponseSchema = z.object({
    value: z.array(z.record(z.string(), z.unknown())).optional(),
    '@odata.nextLink': z.string().optional()
});

const action = createAction({
    description: 'List devices from Microsoft Graph',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Device.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;
        if (input.cursor) {
            // https://learn.microsoft.com/en-us/graph/api/device-list
            response = await nango.get({ endpoint: input.cursor, retries: 3 });
        } else {
            // https://learn.microsoft.com/en-us/graph/api/device-list
            response = await nango.get({ endpoint: '/v1.0/devices', retries: 3 });
        }

        const parsed = ProviderDevicesResponseSchema.parse(response.data);
        const rawDevices = parsed.value ?? [];

        const devices = rawDevices.map((item) => {
            const id = z.string().parse(item['id']);
            const device: z.infer<typeof DeviceSchema> = {
                id,
                ...(item['deviceId'] !== undefined && { deviceId: z.string().parse(item['deviceId']) }),
                ...(item['displayName'] !== undefined && { displayName: z.string().parse(item['displayName']) }),
                ...(item['operatingSystem'] !== undefined && { operatingSystem: z.string().parse(item['operatingSystem']) }),
                ...(item['operatingSystemVersion'] !== undefined && { operatingSystemVersion: z.string().parse(item['operatingSystemVersion']) }),
                ...(item['accountEnabled'] !== undefined && { accountEnabled: z.boolean().parse(item['accountEnabled']) }),
                ...(item['approximateLastSignInDateTime'] !== undefined && {
                    approximateLastSignInDateTime: z.string().parse(item['approximateLastSignInDateTime'])
                }),
                ...(item['enrollmentProfileName'] !== null &&
                    item['enrollmentProfileName'] !== undefined && { enrollmentProfileName: z.string().parse(item['enrollmentProfileName']) }),
                ...(item['managementType'] !== null && item['managementType'] !== undefined && { managementType: z.string().parse(item['managementType']) }),
                ...(item['registrationDateTime'] !== undefined && { registrationDateTime: z.string().parse(item['registrationDateTime']) }),
                ...(item['deviceOwnership'] !== null &&
                    item['deviceOwnership'] !== undefined && { deviceOwnership: z.string().parse(item['deviceOwnership']) }),
                ...(item['domainName'] !== null && item['domainName'] !== undefined && { domainName: z.string().parse(item['domainName']) }),
                ...(item['profileType'] !== null && item['profileType'] !== undefined && { profileType: z.string().parse(item['profileType']) }),
                ...(item['mdmAppId'] !== null && item['mdmAppId'] !== undefined && { mdmAppId: z.string().parse(item['mdmAppId']) }),
                ...(item['complianceExpirationDateTime'] !== null &&
                    item['complianceExpirationDateTime'] !== undefined && {
                        complianceExpirationDateTime: z.string().parse(item['complianceExpirationDateTime'])
                    }),
                ...(item['onPremisesSyncEnabled'] !== null &&
                    item['onPremisesSyncEnabled'] !== undefined && { onPremisesSyncEnabled: z.boolean().parse(item['onPremisesSyncEnabled']) }),
                ...(item['trustType'] !== null && item['trustType'] !== undefined && { trustType: z.string().parse(item['trustType']) }),
                ...(item['alternativeSecurityIds'] !== undefined && {
                    alternativeSecurityIds: z.array(z.record(z.string(), z.unknown())).parse(item['alternativeSecurityIds'])
                })
            };
            return device;
        });

        return {
            devices,
            ...(parsed['@odata.nextLink'] !== undefined && { next_cursor: parsed['@odata.nextLink'] })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
