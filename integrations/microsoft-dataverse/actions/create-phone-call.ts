import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        subject: z.string().describe('Subject of the phone call activity. Example: "Follow-up call about the renewal quote"'),
        description: z.string().optional().describe('Optional free-text notes describing the purpose or content of the phone call'),
        phonenumber: z.string().optional().describe('Optional phone number dialed or received on this call. Example: "+1-555-0100"'),
        regardingobjectid: z
            .object({
                entityLogicalName: z
                    .string()
                    .describe('Logical name of the entity the phone call is regarding, used to pick the navigation property. Example: "account"'),
                entitySetName: z
                    .string()
                    .describe('Entity set name of the entity the phone call is regarding, as used in Dataverse Web API URLs. Example: "accounts"'),
                recordId: z.string().describe('GUID of the existing record the phone call is regarding. Example: "00aa00aa-bb11-cc22-dd33-44ee44ee44ee"')
            })
            .optional()
            .describe('Optional regarding lookup that links the phone call to an existing parent record such as an account, contact, or opportunity')
    })
    .describe('Fields for the new phone call activity');

const OutputSchema = z
    .object({
        id: z.string().describe('GUID of the newly created phone call record, extracted from the OData-EntityId response header')
    })
    .describe('Result of creating the phone call activity');

/**
 * @tags: [write]
 * @tagReason: Creates a new phone call activity record via a POST mutation and reads no provider data.
 * @pitfalls: The create response has no body, so this action returns only the new record's id; read the record back with a separate call if its field values are needed. Creates are not idempotent and duplicate detection is suppressed by default, so invoking this action twice with the same input creates two phone call records.
 */
const action = createAction({
    description: 'Create a phone call activity',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/create-entity-web-api
        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/reference/phonecall
            endpoint: '/api/data/v9.2/phonecalls',
            data: {
                subject: input.subject,
                ...(input.description !== undefined && { description: input.description }),
                ...(input.phonenumber !== undefined && { phonenumber: input.phonenumber }),
                ...(input.regardingobjectid !== undefined && {
                    [`regardingobjectid_${input.regardingobjectid.entityLogicalName}@odata.bind`]: `/${input.regardingobjectid.entitySetName}(${input.regardingobjectid.recordId})`
                })
            },
            // Create has no idempotency key, so a retry after a lost response could create a duplicate record.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        };
        const response = await nango.post(config);

        const entityIdHeader = response.headers['odata-entityid'];
        const headerValue = Array.isArray(entityIdHeader) ? entityIdHeader[0] : entityIdHeader;
        const match =
            typeof headerValue === 'string' ? /\(([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\)/.exec(headerValue) : null;
        const id = match?.[1];
        if (!id) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Phone call create succeeded but no parseable OData-EntityId header was returned'
            });
        }

        return { id };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
