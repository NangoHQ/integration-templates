import { z } from 'zod';
import { createAction } from 'nango';

const LocationInputSchema = z
    .object({
        address1: z.string().optional(),
        address2: z.string().optional(),
        city: z.string().optional(),
        country: z.string().optional(),
        region: z.string().optional(),
        zip: z.string().optional(),
        timezone: z.string().optional(),
        ip: z.string().optional()
    })
    .optional();

const InputSchema = z.object({
    id: z.string().describe('Profile ID. Example: "01KWFX4MZPQDSD3YG79C83CBDV"'),
    email: z.string().optional(),
    phone_number: z.string().optional(),
    external_id: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    title: z.string().optional(),
    organization: z.string().optional(),
    image: z.string().optional(),
    location: LocationInputSchema,
    properties: z.record(z.string(), z.unknown()).optional()
});

const ProviderProfileSchema = z.object({
    data: z.object({
        type: z.string(),
        id: z.string(),
        attributes: z.object({
            email: z.string().nullable().optional(),
            phone_number: z.string().nullable().optional(),
            external_id: z.string().nullable().optional(),
            first_name: z.string().nullable().optional(),
            last_name: z.string().nullable().optional(),
            title: z.string().nullable().optional(),
            organization: z.string().nullable().optional(),
            image: z.string().nullable().optional(),
            location: z
                .object({
                    address1: z.string().nullable().optional(),
                    address2: z.string().nullable().optional(),
                    city: z.string().nullable().optional(),
                    country: z.string().nullable().optional(),
                    region: z.string().nullable().optional(),
                    zip: z.string().nullable().optional(),
                    timezone: z.string().nullable().optional(),
                    ip: z.string().nullable().optional()
                })
                .nullable()
                .optional(),
            properties: z.record(z.string(), z.unknown()).nullable().optional()
        })
    })
});

const OutputSchema = z.object({
    id: z.string(),
    email: z.string().optional(),
    phone_number: z.string().optional(),
    external_id: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    title: z.string().optional(),
    organization: z.string().optional(),
    image: z.string().optional(),
    location: z
        .object({
            address1: z.string().optional(),
            address2: z.string().optional(),
            city: z.string().optional(),
            country: z.string().optional(),
            region: z.string().optional(),
            zip: z.string().optional(),
            timezone: z.string().optional(),
            ip: z.string().optional()
        })
        .optional(),
    properties: z.record(z.string(), z.unknown()).optional()
});

const action = createAction({
    description: 'Update a profile',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['profiles:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const attributes: Record<string, unknown> = {};

        if (input['email'] !== undefined) {
            attributes['email'] = input['email'];
        }
        if (input['phone_number'] !== undefined) {
            attributes['phone_number'] = input['phone_number'];
        }
        if (input['external_id'] !== undefined) {
            attributes['external_id'] = input['external_id'];
        }
        if (input['first_name'] !== undefined) {
            attributes['first_name'] = input['first_name'];
        }
        if (input['last_name'] !== undefined) {
            attributes['last_name'] = input['last_name'];
        }
        if (input['title'] !== undefined) {
            attributes['title'] = input['title'];
        }
        if (input['organization'] !== undefined) {
            attributes['organization'] = input['organization'];
        }
        if (input['image'] !== undefined) {
            attributes['image'] = input['image'];
        }
        if (input['location'] !== undefined) {
            attributes['location'] = input['location'];
        }
        if (input['properties'] !== undefined) {
            attributes['properties'] = input['properties'];
        }

        // https://developers.klaviyo.com/en/reference/update_profile
        const response = await nango.patch({
            endpoint: `/api/profiles/${encodeURIComponent(input.id)}`,
            headers: {
                revision: '2026-04-15'
            },
            data: {
                data: {
                    type: 'profile',
                    id: input.id,
                    attributes
                }
            },
            retries: 3
        });

        const parsed = ProviderProfileSchema.parse(response.data);
        const attrs = parsed.data.attributes;

        return {
            id: parsed.data.id,
            ...(attrs['email'] != null && { email: attrs['email'] }),
            ...(attrs['phone_number'] != null && { phone_number: attrs['phone_number'] }),
            ...(attrs['external_id'] != null && { external_id: attrs['external_id'] }),
            ...(attrs['first_name'] != null && { first_name: attrs['first_name'] }),
            ...(attrs['last_name'] != null && { last_name: attrs['last_name'] }),
            ...(attrs['title'] != null && { title: attrs['title'] }),
            ...(attrs['organization'] != null && { organization: attrs['organization'] }),
            ...(attrs['image'] != null && { image: attrs['image'] }),
            ...(attrs['location'] != null && {
                location: {
                    ...(attrs['location']['address1'] != null && { address1: attrs['location']['address1'] }),
                    ...(attrs['location']['address2'] != null && { address2: attrs['location']['address2'] }),
                    ...(attrs['location']['city'] != null && { city: attrs['location']['city'] }),
                    ...(attrs['location']['country'] != null && { country: attrs['location']['country'] }),
                    ...(attrs['location']['region'] != null && { region: attrs['location']['region'] }),
                    ...(attrs['location']['zip'] != null && { zip: attrs['location']['zip'] }),
                    ...(attrs['location']['timezone'] != null && { timezone: attrs['location']['timezone'] }),
                    ...(attrs['location']['ip'] != null && { ip: attrs['location']['ip'] })
                }
            }),
            ...(attrs['properties'] != null && { properties: attrs['properties'] })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
