import { z } from 'zod';
import { createAction } from 'nango';

const EmailMessageSchema = z.object({
    from: z.string().nullish(),
    id: z.string().nullish(),
    sentTime: z.string().nullish(),
    mailbox: z.string().nullish(),
    messageHash: z.string().nullish()
});

const ExternalSystemObjectSchema = z.object({
    objectType: z.string().nullish(),
    externalId: z.string().nullish()
});

const ExternalSystemSchema = z.object({
    system: z.string().nullish(),
    objects: z.array(ExternalSystemObjectSchema).nullish()
});

const CallReferenceSchema = z.object({
    id: z.string().optional(),
    status: z.string().nullish(),
    externalSystems: z.array(ExternalSystemSchema).nullish()
});

const MeetingSchema = z.object({
    id: z.string().optional()
});

const ContextFieldSchema = z.object({
    name: z.string().nullish(),
    value: z.unknown().nullish()
});

const CustomerDataObjectSchema = z.object({
    id: z.string().optional(),
    objectType: z.string().nullish(),
    externalId: z.string().nullish(),
    mirrorId: z.string().nullish(),
    fields: z.array(ContextFieldSchema).nullish()
});

const CustomerDataSchema = z.object({
    system: z.string().nullish(),
    objects: z.array(CustomerDataObjectSchema).nullish()
});

const CustomerEngagementSchema = z.object({
    eventType: z.string().nullish(),
    timestamp: z.string().nullish(),
    contentId: z.string().nullish(),
    contentUrl: z.string().nullish(),
    reportingSystem: z.string().nullish(),
    eventName: z.string().nullish(),
    sourceEventId: z.string().nullish()
});

const ProviderResponseSchema = z.object({
    requestId: z.string().optional(),
    emails: z.array(EmailMessageSchema).nullish(),
    calls: z.array(CallReferenceSchema).nullish(),
    meetings: z.array(MeetingSchema).nullish(),
    customerData: z.array(CustomerDataSchema).nullish(),
    customerEngagement: z.array(CustomerEngagementSchema).nullish()
});

const InputSchema = z.object({
    emailAddress: z.string().describe('The email address to look up. Example: "user@example.com"')
});

const action = createAction({
    description: 'Retrieve all Gong references associated with a specific email address.',
    version: '1.0.2',
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
