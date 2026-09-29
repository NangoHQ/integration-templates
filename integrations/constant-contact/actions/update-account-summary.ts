import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        first_name: z.string().optional().describe('First name of the account contact. Example: "Nango"'),
        last_name: z.string().optional().describe('Last name of the account contact. Example: "Developer"'),
        organization_name: z.string().optional().describe('Name of the organization on the account. Example: "Nango"'),
        time_zone_id: z.string().optional().describe('Time zone of the account, as an IANA time zone ID. Example: "America/New_York"'),
        country_code: z.string().optional().describe('Two-letter country code of the account. Example: "us"')
    })
    .describe('Account summary fields to update. At least one field must be provided; omitted fields are left unchanged.');

const OutputSchema = z
    .object({
        contact_email: z.string().optional().describe('Email address of the account contact. Example: "api@nango.dev"'),
        contact_phone: z.string().optional().describe('Phone number of the account contact.'),
        country_code: z.string().optional().describe('Two-letter country code of the account. Example: "us"'),
        encoded_account_id: z.string().optional().describe('Encoded Constant Contact account ID.'),
        first_name: z.string().optional().describe('First name of the account contact. Example: "Nango"'),
        last_name: z.string().optional().describe('Last name of the account contact. Example: "Developer"'),
        organization_name: z.string().optional().describe('Name of the organization on the account. Example: "Nango"'),
        time_zone_id: z.string().optional().describe('Time zone of the account, as an IANA time zone ID. Example: "Africa/Nairobi"')
    })
    .describe('The updated account summary.');

/**
 * @tags: [write]
 * @tagReason: Mutates the Constant Contact account's organization and contact profile summary.
 */
const action = createAction({
    description: "Update the account's organization/contact profile summary (name, organization, time zone, country).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['account_update'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const { first_name, last_name, organization_name, time_zone_id, country_code } = input;

        if (
            first_name === undefined &&
            last_name === undefined &&
            organization_name === undefined &&
            time_zone_id === undefined &&
            country_code === undefined
        ) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one field must be provided to update the account summary.'
            });
        }

        const config: ProxyConfiguration = {
            // https://v3.developer.constantcontact.com/api_reference/index.html
            endpoint: '/v3/account/summary',
            data: {
                ...(first_name !== undefined && { first_name }),
                ...(last_name !== undefined && { last_name }),
                ...(organization_name !== undefined && { organization_name }),
                ...(time_zone_id !== undefined && { time_zone_id }),
                ...(country_code !== undefined && { country_code })
            },
            // PUT sets absolute field values, so a retry of the same request is idempotent.
            retries: 3
        };

        const response = await nango.put(config);

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
