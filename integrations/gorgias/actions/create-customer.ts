import { z } from 'zod';
import { createAction } from 'nango';

const ChannelInputSchema = z.object({
    type: z.string().describe('The channel type, e.g. email, phone, chat, etc.'),
    address: z.string().describe('The channel address, e.g. an email address or phone number.'),
    preferred: z.boolean().describe('Whether this is the preferred channel to contact the customer.')
});

const InputSchema = z
    .object({
        name: z.string().optional().describe('Full name of the customer. The API splits this into firstname and lastname on the server side.'),
        email: z.string().optional().describe('Primary email address of the customer.'),
        external_id: z.string().optional().describe('ID of the customer in a foreign system.'),
        language: z.string().optional().describe("The customer's preferred language (ISO 639-1)."),
        timezone: z.string().optional().describe("The customer's preferred timezone (IANA timezone name)."),
        channels: z.array(ChannelInputSchema).describe("The customer's contact channels. At least one channel is required.")
    })
    .describe('Input for creating a Gorgias customer.');

const ChannelOutputSchema = z.object({
    id: z.number().describe('ID of the customer channel.'),
    type: z.string().describe('The channel type.'),
    address: z.string().describe('The channel address.'),
    preferred: z.boolean().describe('Whether this is the preferred channel.')
});

const OutputSchema = z
    .object({
        id: z.number().describe('ID of the created customer.'),
        name: z.string().optional().describe('Full name of the customer.'),
        firstname: z.string().optional().describe('First name of the customer, derived server-side from the name field.'),
        lastname: z.string().optional().describe('Last name of the customer, derived server-side from the name field.'),
        email: z.string().optional().describe('Primary email address of the customer.'),
        external_id: z.string().optional().describe('ID of the customer in a foreign system.'),
        language: z.string().optional().describe("The customer's preferred language."),
        timezone: z.string().optional().describe("The customer's preferred timezone."),
        channels: z.array(ChannelOutputSchema).optional().describe("The customer's contact channels."),
        created_datetime: z.string().optional().describe('When the customer was created.'),
        updated_datetime: z.string().optional().describe('When the customer was last updated.')
    })
    .describe('Output representing a created Gorgias customer.');

const ProviderChannelSchema = z
    .object({
        id: z.number().optional(),
        type: z.string().optional(),
        address: z.string().optional(),
        preferred: z.boolean().optional()
    })
    .passthrough();

const ProviderCustomerSchema = z
    .object({
        id: z.number(),
        name: z.string().nullable().optional(),
        firstname: z.string().nullable().optional(),
        lastname: z.string().nullable().optional(),
        email: z.string().nullable().optional(),
        external_id: z.string().nullable().optional(),
        language: z.string().nullable().optional(),
        timezone: z.string().nullable().optional(),
        channels: z.array(ProviderChannelSchema).optional(),
        created_datetime: z.string().nullable().optional(),
        updated_datetime: z.string().nullable().optional()
    })
    .passthrough();

/**
 * @tags: [write]
 * @tagReason: Creates a new customer record in the Gorgias API.
 * @pitfalls: The API only accepts `name` for the full name and derives `firstname`/`lastname` from it; passing `firstname`/`lastname` directly is rejected. Reusing an email address already assigned to another customer fails with a 400 error.
 */
const action = createAction({
    description: 'Create a customer with one or more contact channels.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customers:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.gorgias.com/reference/create-customer
            endpoint: '/api/customers',
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.email !== undefined && { email: input.email }),
                ...(input.external_id !== undefined && { external_id: input.external_id }),
                ...(input.language !== undefined && { language: input.language }),
                ...(input.timezone !== undefined && { timezone: input.timezone }),
                channels: input.channels.map((ch) => ({
                    type: ch.type,
                    address: ch.address,
                    preferred: ch.preferred
                }))
            },
            retries: 3
        });

        const providerCustomer = ProviderCustomerSchema.parse(response.data);

        return {
            id: providerCustomer.id,
            ...(providerCustomer.name != null && { name: providerCustomer.name }),
            ...(providerCustomer.firstname != null && { firstname: providerCustomer.firstname }),
            ...(providerCustomer.lastname != null && { lastname: providerCustomer.lastname }),
            ...(providerCustomer.email != null && { email: providerCustomer.email }),
            ...(providerCustomer.external_id != null && { external_id: providerCustomer.external_id }),
            ...(providerCustomer.language != null && { language: providerCustomer.language }),
            ...(providerCustomer.timezone != null && { timezone: providerCustomer.timezone }),
            ...(providerCustomer.channels !== undefined && {
                channels: providerCustomer.channels.map((ch) => ({
                    id: ch.id ?? 0,
                    type: ch.type ?? '',
                    address: ch.address ?? '',
                    preferred: ch.preferred ?? false
                }))
            }),
            ...(providerCustomer.created_datetime != null && { created_datetime: providerCustomer.created_datetime }),
            ...(providerCustomer.updated_datetime != null && { updated_datetime: providerCustomer.updated_datetime })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
