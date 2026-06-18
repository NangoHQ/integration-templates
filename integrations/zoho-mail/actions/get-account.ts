import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    accountId: z.string().describe('The unique ID of the account to retrieve. Example: "4845214000000008002"')
});

const EmailAddressSchema = z.object({
    isAlias: z.boolean(),
    isPrimary: z.boolean(),
    mailId: z.string(),
    isConfirmed: z.boolean()
});

const SendMailDetailSchema = z.object({
    sendMailId: z.string(),
    displayName: z.string(),
    serverName: z.string(),
    signatureId: z.string(),
    serverPort: z.number(),
    userName: z.string(),
    connectionType: z.string(),
    mode: z.string(),
    validated: z.boolean(),
    fromAddress: z.string(),
    smtpConnection: z.number(),
    validationRequired: z.boolean(),
    validationState: z.number(),
    status: z.boolean(),
    verifyCode: z.number().optional()
});

const AddressSchema = z.object({
    country: z.string().optional(),
    streetAddr: z.string().optional(),
    city: z.string().optional(),
    postalCode: z.string().optional(),
    state: z.string().optional()
});

const OutputSchema = z
    .object({
        country: z.string().optional(),
        lastLogin: z.number().optional(),
        mxStatus: z.boolean().optional(),
        activeSyncEnabled: z.boolean().optional(),
        mobileNumber: z.string().optional(),
        incomingBlocked: z.boolean().optional(),
        language: z.string().optional(),
        type: z.string().optional(),
        extraStorage: z.record(z.string(), z.unknown()).optional(),
        incomingUserName: z.string().optional(),
        emailAddress: z.array(EmailAddressSchema).optional(),
        mailboxStatus: z.string().optional(),
        popBlocked: z.boolean().optional(),
        usedStorage: z.number().optional(),
        spamcheckEnabled: z.boolean().optional(),
        imapAccessEnabled: z.boolean().optional(),
        timeZone: z.string().optional(),
        accountCreationTime: z.number().optional(),
        zuid: z.number().optional(),
        webBlocked: z.boolean().optional(),
        planStorage: z.number().optional(),
        firstName: z.string().optional(),
        accountId: z.string(),
        sequence: z.number().optional(),
        mailboxAddress: z.string().optional(),
        lastPasswordReset: z.number().optional(),
        tfaEnabled: z.boolean().optional(),
        phoneNumer: z.string().optional(),
        status: z.boolean().optional(),
        lastName: z.string().optional(),
        accountDisplayName: z.string().optional(),
        role: z.string().optional(),
        gender: z.string().optional(),
        accountName: z.string().optional(),
        displayName: z.string().optional(),
        isLogoExist: z.boolean().optional(),
        URI: z.string().optional(),
        primaryEmailAddress: z.string().optional(),
        enabled: z.boolean().optional(),
        mailboxCreationTime: z.number().optional(),
        basicStorage: z.string().optional(),
        lastClient: z.string().optional(),
        allowedStorage: z.number().optional(),
        sendMailDetails: z.array(SendMailDetailSchema).optional(),
        popFetchTime: z.number().optional(),
        address: AddressSchema.optional(),
        planType: z.number().optional(),
        userExpiry: z.number().optional(),
        popAccessEnabled: z.boolean().optional(),
        imapBlocked: z.boolean().optional(),
        iamUserRole: z.string().optional(),
        outgoingBlocked: z.boolean().optional(),
        policyId: z.record(z.string(), z.unknown()).optional(),
        smtpStatus: z.boolean().optional(),
        extraEDiscoveryStorage: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const ZohoResponseSchema = z.object({
    status: z.object({
        code: z.number(),
        description: z.string()
    }),
    data: OutputSchema
});

const action = createAction({
    description: 'Retrieve a single account from Zoho Mail',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoMail.accounts.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.zoho.com/mail/help/api/get-user-account-details.html
            endpoint: `/api/accounts/${encodeURIComponent(input.accountId)}`,
            retries: 3
        });

        const parsed = ZohoResponseSchema.parse(response.data);

        if (parsed.status.code !== 200) {
            throw new nango.ActionError({
                type: 'api_error',
                message: `Zoho Mail API returned status ${parsed.status.code}: ${parsed.status.description}`,
                accountId: input.accountId
            });
        }

        return parsed.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
