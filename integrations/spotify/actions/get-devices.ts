import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    // No input required for listing devices
});

const DeviceSchema = z.object({
    id: z.string().optional().describe('The device ID. Example: "1234567890abcdef"'),
    is_active: z.boolean().describe('If this device is the currently active device'),
    is_private_session: z.boolean().optional().describe('If this device is in private mode'),
    is_restricted: z.boolean().optional().describe('Whether controlling this device is restricted'),
    name: z.string().describe('The device name. Example: "My iPhone"'),
    type: z.string().describe('The device type. Example: "Computer", "Smartphone"'),
    volume_percent: z.number().nullable().optional().describe('The current volume in percent. Example: 50')
});

const ProviderDevicesResponseSchema = z.object({
    devices: z.array(DeviceSchema)
});

const OutputSchema = z.object({
    devices: z.array(
        z.object({
            id: z.string().optional(),
            name: z.string(),
            type: z.string(),
            is_active: z.boolean(),
            volume_percent: z.number().nullable().optional()
        })
    )
});

const action = createAction({
    description: "List the user's available Spotify Connect devices",
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user-read-playback-state'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.spotify.com/documentation/web-api/reference/get-a-users-available-devices
            endpoint: '/v1/me/player/devices',
            retries: 3
        });

        const providerData = ProviderDevicesResponseSchema.parse(response.data);

        return {
            devices: providerData.devices.map((device) => ({
                id: device.id,
                name: device.name,
                type: device.type,
                is_active: device.is_active,
                ...(device.volume_percent !== undefined && { volume_percent: device.volume_percent })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
