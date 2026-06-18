import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    phoneNumber: z
        .string()
        .regex(/^\+[1-9]\d{1,14}$/, 'Phone number must be in E.164 format: + followed by 2–15 digits. Example: "+15555550100"')
        .describe('The phone number to look up in E.164 format. Example: "+15555550100"')
});

const ProviderDataSchema = z.object({
    calls: z.array(z.unknown()).nullish(),
    customerData: z.array(z.unknown()).nullish(),
    emailAddresses: z.array(z.unknown()).nullish(),
    emails: z.array(z.unknown()).nullish(),
    matchingPhoneNumbers: z.array(z.unknown()).nullish(),
    meetings: z.array(z.unknown()).nullish(),
    requestId: z.string().nullish(),
    suppliedPhoneNumber: z.string().nullish()
});

const OutputSchema = z.object({
    calls: z.array(z.unknown()).optional(),
    customerData: z.array(z.unknown()).optional(),
    emailAddresses: z.array(z.unknown()).optional(),
    emails: z.array(z.unknown()).optional(),
    matchingPhoneNumbers: z.array(z.unknown()).optional(),
    meetings: z.array(z.unknown()).optional(),
    requestId: z.string().optional(),
    suppliedPhoneNumber: z.string().optional()
});

const action = createAction({
    description: 'Retrieve all Gong references associated with a specific phone number.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:data-privacy:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://help.gong.io/docs/what-the-gong-api-provides
            endpoint: '/v2/data-privacy/data-for-phone-number',
            params: {
                phoneNumber: input.phoneNumber
            },
            retries: 3
        });

        const providerData = ProviderDataSchema.parse(response.data);

        return {
            ...(providerData.calls != null && { calls: providerData.calls }),
            ...(providerData.customerData != null && { customerData: providerData.customerData }),
            ...(providerData.emailAddresses != null && { emailAddresses: providerData.emailAddresses }),
            ...(providerData.emails != null && { emails: providerData.emails }),
            ...(providerData.matchingPhoneNumbers != null && { matchingPhoneNumbers: providerData.matchingPhoneNumbers }),
            ...(providerData.meetings != null && { meetings: providerData.meetings }),
            ...(providerData.requestId != null && { requestId: providerData.requestId }),
            ...(providerData.suppliedPhoneNumber != null && { suppliedPhoneNumber: providerData.suppliedPhoneNumber })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
