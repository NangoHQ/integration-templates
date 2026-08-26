import { z } from 'zod';
import { createAction } from 'nango';

const ChannelInputSchema = z.object({
    type: z.string().describe('Channel type slug, e.g., email, phone, chat.'),
    address: z.string().describe('Channel address, e.g., email address or phone number.'),
    preferred: z.boolean().describe('Whether this is the preferred channel to contact the customer.')
});

const InputSchema = z
    .object({
        id: z.number().describe('The unique ID of the customer to update.'),
        name: z.string().optional().describe('Full name of the customer. Use instead of firstname/lastname.'),
        email: z.string().optional().describe('Primary email address of the customer.'),
        channels: z.array(ChannelInputSchema).optional().describe('List of communication channels for the customer.'),
        language: z.string().optional().describe("The customer's preferred language (ISO 639-1)."),
        timezone: z.string().optional().describe("The customer's preferred timezone (IANA timezone name)."),
        external_id: z.string().optional().describe('External identifier for the customer.')
    })
    .describe('Input fields for updating an existing customer.');

const ChannelOutputSchema = z.object({
    id: z.number().optional().describe('ID of the customer channel.'),
    type: z.string().optional().describe('Channel type slug.'),
    address: z.string().optional().describe('Channel address.'),
    preferred: z.boolean().optional().describe('Whether this is the preferred channel.')
});

const OutputSchema = z
    .object({
        id: z.number().describe('The unique ID of the updated customer.'),
        name: z.string().nullable().optional().describe('Full name of the customer.'),
        email: z.string().nullable().optional().describe('Primary email address of the customer.'),
        channels: z.array(ChannelOutputSchema).optional().describe('List of communication channels.'),
        language: z.string().nullable().optional().describe('Preferred language (ISO 639-1).'),
        timezone: z.string().nullable().optional().describe('Preferred timezone (IANA timezone name).'),
        external_id: z.string().nullable().optional().describe('External identifier for the customer.')
    })
    .describe('The updated customer object returned by the provider.');

const ProviderCustomerChannelSchema = z
    .object({
        id: z.number().optional(),
        type: z.string().optional(),
        address: z.string().optional(),
        preferred: z.boolean().optional()
    })
    .passthrough();

const ProviderCustomerSchema = z.object({
    id: z.number(),
    name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    channels: z.array(ProviderCustomerChannelSchema).optional(),
    language: z.string().nullable().optional(),
    timezone: z.string().nullable().optional(),
    external_id: z.string().nullable().optional()
});

/**
 * @tags: [write]
 * @tagReason: Updates an existing customer's fields via the Gorgias API.
 * @pitfalls: The update endpoint requires 'name' instead of 'firstname'/'lastname', and each channel object must include 'type', 'address', and 'preferred'.
 */
const action = createAction({
    description: "Update a customer's fields (name, email, channels, language, timezone, external ID).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customers:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {};
        if (input.name !== undefined) {
            data['name'] = input.name;
        }
        if (input.email !== undefined) {
            data['email'] = input.email;
        }
        if (input.channels !== undefined) {
            data['channels'] = input.channels;
        }
        if (input.language !== undefined) {
            data['language'] = input.language;
        }
        if (input.timezone !== undefined) {
            data['timezone'] = input.timezone;
        }
        if (input.external_id !== undefined) {
            data['external_id'] = input.external_id;
        }

        // https://developers.gorgias.com/reference/update-customer
        const response = await nango.put({
            endpoint: `/api/customers/${encodeURIComponent(String(input.id))}`,
            data,
            retries: 3
        });

        const providerCustomer = ProviderCustomerSchema.parse(response.data);

        return {
            id: providerCustomer.id,
            ...(providerCustomer.name !== undefined && { name: providerCustomer.name }),
            ...(providerCustomer.email !== undefined && { email: providerCustomer.email }),
            ...(providerCustomer.channels !== undefined && {
                channels: providerCustomer.channels.map((channel) => ({
                    ...(channel.id !== undefined && { id: channel.id }),
                    ...(channel.type !== undefined && { type: channel.type }),
                    ...(channel.address !== undefined && { address: channel.address }),
                    ...(channel.preferred !== undefined && { preferred: channel.preferred })
                }))
            }),
            ...(providerCustomer.language !== undefined && { language: providerCustomer.language }),
            ...(providerCustomer.timezone !== undefined && { timezone: providerCustomer.timezone }),
            ...(providerCustomer.external_id !== undefined && { external_id: providerCustomer.external_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
