import { z } from 'zod';
import { createAction } from 'nango';

const EmailMessageSchema = z.object({
    from: z.string().optional(),
    id: z.string().optional(),
    sentTime: z.string().optional(),
    mailbox: z.string().optional(),
    messageHash: z.string().optional()
});

const ExternalSystemObjectSchema = z.object({
    objectType: z.string().optional(),
    externalId: z.string().optional()
});

const ExternalSystemSchema = z.object({
    system: z.string().optional(),
    objects: z.array(ExternalSystemObjectSchema).optional()
});

const CallReferenceSchema = z.object({
    id: z.string().optional(),
    status: z.string().optional(),
    externalSystems: z.array(ExternalSystemSchema).optional()
});

const MeetingSchema = z.object({
    id: z.string().optional()
});

const ContextFieldSchema = z.object({
    name: z.string().optional(),
    value: z.unknown().optional()
});

const CustomerDataObjectSchema = z.object({
    id: z.string().optional(),
    objectType: z.string().optional(),
    externalId: z.string().optional(),
    mirrorId: z.string().optional(),
    fields: z.array(ContextFieldSchema).optional()
});

const CustomerDataSchema = z.object({
    system: z.string().optional(),
    objects: z.array(CustomerDataObjectSchema).optional()
});

const CustomerEngagementSchema = z.object({
    eventType: z.string().optional(),
    timestamp: z.string().optional(),
    contentId: z.string().optional(),
    contentUrl: z.string().optional(),
    reportingSystem: z.string().optional(),
    eventName: z.string().optional(),
    sourceEventId: z.string().optional()
});

const ProviderResponseSchema = z.object({
    requestId: z.string().optional(),
    emails: z.array(EmailMessageSchema).optional(),
    calls: z.array(CallReferenceSchema).optional(),
    meetings: z.array(MeetingSchema).optional(),
    customerData: z.array(CustomerDataSchema).optional(),
    customerEngagement: z.array(CustomerEngagementSchema).optional()
});

const InputSchema = z.object({
    emailAddress: z.string().describe('The email address to look up. Example: "user@example.com"')
});

const action = createAction({
    description: 'Retrieve all Gong references associated with a specific email address.',
    version: '1.0.1',
    input: InputSchema,
    output: ProviderResponseSchema,
    scopes: ['api:data-privacy:read'],

    exec: async (nango, input): Promise<z.infer<typeof ProviderResponseSchema>> => {
        // https://help.gong.io/apidocs/retrieve-all-references-to-an-email-address-v2data-privacydata-for-email-address.md
        const response = await nango.get({
            endpoint: '/v2/data-privacy/data-for-email-address',
            params: {
                emailAddress: input.emailAddress
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            ...(providerResponse.requestId !== undefined && { requestId: providerResponse.requestId }),
            ...(providerResponse.emails !== undefined && { emails: providerResponse.emails }),
            ...(providerResponse.calls !== undefined && { calls: providerResponse.calls }),
            ...(providerResponse.meetings !== undefined && { meetings: providerResponse.meetings }),
            ...(providerResponse.customerData !== undefined && { customerData: providerResponse.customerData }),
            ...(providerResponse.customerEngagement !== undefined && { customerEngagement: providerResponse.customerEngagement })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
