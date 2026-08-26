import { createAction } from 'nango';
import { z } from 'zod';

const CustomerChannelSchema = z.object({
    type: z.string().describe('Channel type. Example: "email", "phone"'),
    address: z.string().describe('Channel address. Example: "john@example.com"'),
    preferred: z.boolean().describe('Whether this is the preferred channel to contact the customer.')
});

const InputSchema = z
    .object({
        source_id: z.number().int().describe('The ID of the customer to merge (will be deleted).'),
        target_id: z.number().int().describe('The ID of the customer to merge into (will be retained).'),
        channels: z.array(CustomerChannelSchema).optional().describe('Contact channels to set on the target customer after merge.'),
        email: z.string().email().optional().describe('Primary email address to set on the target customer after merge.'),
        external_id: z.string().optional().describe('External ID to set on the target customer after merge.'),
        language: z.string().optional().describe('Preferred language (ISO 639-1) to set on the target customer after merge.'),
        name: z.string().optional().describe('Full name to set on the target customer after merge.'),
        timezone: z.string().optional().describe('Preferred timezone (IANA name) to set on the target customer after merge.')
    })
    .describe('Input for merging two customers.');

const OutputChannelSchema = z.object({
    id: z.number().int().optional().describe('ID of the customer channel.'),
    type: z.string().optional().describe('Channel type.'),
    address: z.string().optional().describe('Channel address.'),
    preferred: z.boolean().optional().describe('Whether this is the preferred channel.')
});

const OutputSchema = z
    .object({
        id: z.number().int().describe('ID of the merged (target) customer.'),
        channels: z.array(OutputChannelSchema).optional().describe('Contact channels of the merged customer.'),
        created_datetime: z.string().optional().describe('When the customer was created.'),
        email: z.string().email().nullable().optional().describe('Primary email address of the merged customer.'),
        external_id: z.string().nullable().optional().describe('External ID of the merged customer.'),
        firstname: z.string().optional().describe('First name of the merged customer (read-only, derived from name).'),
        lastname: z.string().optional().describe('Last name of the merged customer (read-only, derived from name).'),
        language: z.string().nullable().optional().describe('Preferred language of the merged customer.'),
        name: z.string().nullable().optional().describe('Full name of the merged customer.'),
        note: z.string().nullable().optional().describe('Note associated with the merged customer.'),
        timezone: z.string().nullable().optional().describe('Preferred timezone of the merged customer.'),
        uri: z.string().optional().describe('URI of the merged customer resource.')
    })
    .describe('The merged target customer returned after the source customer has been merged into it.');

/**
 * @tags: [write, destructive]
 * @tagReason: Merges the source customer into the target and permanently deletes the source customer.
 * @pitfalls: Merging is irreversible. The API requires at least one body field (e.g., name or email) in addition to the IDs. If both customers have data for the same integration, the API returns a conflict error.
 */
const action = createAction({
    description: 'Merge one customer into another, deleting the source customer.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customers:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: {
            channels?: z.infer<typeof CustomerChannelSchema>[];
            email?: string;
            external_id?: string;
            language?: string;
            name?: string;
            timezone?: string;
        } = {};
        if (input.channels !== undefined) {
            body.channels = input.channels;
        }
        if (input.email !== undefined) {
            body.email = input.email;
        }
        if (input.external_id !== undefined) {
            body.external_id = input.external_id;
        }
        if (input.language !== undefined) {
            body.language = input.language;
        }
        if (input.name !== undefined) {
            body.name = input.name;
        }
        if (input.timezone !== undefined) {
            body.timezone = input.timezone;
        }

        if (Object.keys(body).length === 0) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one customer field (channels, email, external_id, language, name, or timezone) must be provided in the merge body.'
            });
        }

        // https://developers.gorgias.com/reference/merge-customers
        const response = await nango.put({
            endpoint: '/api/customers/merge',
            params: {
                source_id: input.source_id,
                target_id: input.target_id
            },
            data: body,
            retries: 3
        });

        const customer = OutputSchema.parse(response.data);
        return customer;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
