import { z } from 'zod';
import { createAction } from 'nango';

const ProviderEmailAddressSchema = z.object({
    isAlias: z.boolean().optional(),
    isPrimary: z.boolean().optional(),
    mailId: z.string().optional(),
    isConfirmed: z.boolean().optional()
});

const ProviderMailForwardSchema = z.object({
    mailForwardTo: z.string().optional(),
    type: z.string().optional(),
    status: z.string().optional()
});

const ProviderVacationResponseSchema = z.object({
    replyType: z.number().optional(),
    sendTo: z.number().optional(),
    infiniteDate: z.boolean().optional(),
    subject: z.string().optional(),
    toDate: z.string().optional(),
    includeSignature: z.number().optional(),
    content: z.string().optional(),
    markBusy: z.number().optional(),
    fromDate: z.string().optional(),
    accountId: z.string().optional(),
    intervalType: z.number().optional(),
    name: z.string().optional(),
    interval: z.number().optional(),
    accType: z.number().optional(),
    vacationId: z.string().optional()
});

const ProviderSendMailDetailSchema = z.object({
    sendMailId: z.string().optional(),
    displayName: z.string().optional(),
    serverName: z.string().optional(),
    signatureId: z.string().optional(),
    serverPort: z.number().optional(),
    userName: z.string().optional(),
    connectionType: z.string().optional(),
    mode: z.string().optional(),
    validated: z.boolean().optional(),
    fromAddress: z.string().optional(),
    smtpConnection: z.number().optional(),
    validationRequired: z.boolean().optional(),
    validationState: z.number().optional(),
    status: z.boolean().optional()
});

const ProviderAddressSchema = z.object({
    country: z.string().optional(),
    streetAddr: z.string().optional(),
    city: z.string().optional(),
    postalCode: z.string().optional(),
    state: z.string().optional()
});

const ProviderAccountSchema = z.object({
    accountId: z.string(),
    accountDisplayName: z.string().optional().nullable(),
    accountName: z.string().optional().nullable(),
    displayName: z.string().optional().nullable(),
    emailAddress: z.array(ProviderEmailAddressSchema).optional(),
    enabled: z.boolean().optional(),
    incomingUserName: z.string().optional().nullable(),
    lastLogin: z.number().optional(),
    mailboxAddress: z.string().optional().nullable(),
    primaryEmailAddress: z.string().optional().nullable(),
    role: z.string().optional().nullable(),
    sequence: z.number().optional(),
    status: z.boolean().optional(),
    type: z.string().optional(),
    zuid: z.number().optional(),
    URI: z.string().optional(),
    country: z.string().optional().nullable(),
    language: z.string().optional().nullable(),
    timeZone: z.string().optional().nullable(),
    mailboxStatus: z.string().optional().nullable(),
    firstName: z.string().optional().nullable(),
    lastName: z.string().optional().nullable(),
    gender: z.string().optional().nullable(),
    allowedStorage: z.number().optional(),
    usedStorage: z.number().optional(),
    basicStorage: z.string().optional().nullable(),
    accountCreationTime: z.number().optional(),
    mailboxCreationTime: z.number().optional(),
    lastPasswordReset: z.number().optional(),
    tfaEnabled: z.boolean().optional(),
    activeSyncEnabled: z.boolean().optional(),
    imapAccessEnabled: z.boolean().optional(),
    popAccessEnabled: z.boolean().optional(),
    smtpStatus: z.boolean().optional(),
    webBlocked: z.boolean().optional(),
    incomingBlocked: z.boolean().optional(),
    outgoingBlocked: z.boolean().optional(),
    popBlocked: z.boolean().optional(),
    imapBlocked: z.boolean().optional(),
    spamcheckEnabled: z.boolean().optional(),
    deleteCopy: z.boolean().optional(),
    mobileNumber: z.string().optional().nullable(),
    phoneNumer: z.string().optional().nullable(),
    address: ProviderAddressSchema.optional(),
    lastClient: z.string().optional().nullable(),
    planType: z.number().optional(),
    planStorage: z.number().optional(),
    popFetchTime: z.number().optional(),
    userExpiry: z.number().optional(),
    isLogoExist: z.boolean().optional(),
    mxStatus: z.boolean().optional(),
    mailForward: z.array(ProviderMailForwardSchema).optional(),
    vacationResponse: z.array(ProviderVacationResponseSchema).optional(),
    sendMailDetails: z.array(ProviderSendMailDetailSchema).optional()
});

const ProviderResponseSchema = z.object({
    status: z.object({
        code: z.number(),
        description: z.string()
    }),
    data: z.array(ProviderAccountSchema)
});

const EmailAddressSchema = z.object({
    isAlias: z.boolean().optional(),
    isPrimary: z.boolean().optional(),
    mailId: z.string().optional(),
    isConfirmed: z.boolean().optional()
});

const MailForwardSchema = z.object({
    mailForwardTo: z.string().optional(),
    type: z.string().optional(),
    status: z.string().optional()
});

const VacationResponseSchema = z.object({
    replyType: z.number().optional(),
    sendTo: z.number().optional(),
    infiniteDate: z.boolean().optional(),
    subject: z.string().optional(),
    toDate: z.string().optional(),
    includeSignature: z.number().optional(),
    content: z.string().optional(),
    markBusy: z.number().optional(),
    fromDate: z.string().optional(),
    accountId: z.string().optional(),
    intervalType: z.number().optional(),
    name: z.string().optional(),
    interval: z.number().optional(),
    accType: z.number().optional(),
    vacationId: z.string().optional()
});

const SendMailDetailSchema = z.object({
    sendMailId: z.string().optional(),
    displayName: z.string().optional(),
    serverName: z.string().optional(),
    signatureId: z.string().optional(),
    serverPort: z.number().optional(),
    userName: z.string().optional(),
    connectionType: z.string().optional(),
    mode: z.string().optional(),
    validated: z.boolean().optional(),
    fromAddress: z.string().optional(),
    smtpConnection: z.number().optional(),
    validationRequired: z.boolean().optional(),
    validationState: z.number().optional(),
    status: z.boolean().optional()
});

const AddressSchema = z.object({
    country: z.string().optional(),
    streetAddr: z.string().optional(),
    city: z.string().optional(),
    postalCode: z.string().optional(),
    state: z.string().optional()
});

const AccountSchema = z.object({
    accountId: z.string(),
    accountDisplayName: z.string().optional(),
    accountName: z.string().optional(),
    displayName: z.string().optional(),
    emailAddress: z.array(EmailAddressSchema).optional(),
    enabled: z.boolean().optional(),
    incomingUserName: z.string().optional(),
    lastLogin: z.number().optional(),
    mailboxAddress: z.string().optional(),
    primaryEmailAddress: z.string().optional(),
    role: z.string().optional(),
    sequence: z.number().optional(),
    status: z.boolean().optional(),
    type: z.string().optional(),
    zuid: z.number().optional(),
    uri: z.string().optional(),
    country: z.string().optional(),
    language: z.string().optional(),
    timeZone: z.string().optional(),
    mailboxStatus: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    gender: z.string().optional(),
    allowedStorage: z.number().optional(),
    usedStorage: z.number().optional(),
    basicStorage: z.string().optional(),
    accountCreationTime: z.number().optional(),
    mailboxCreationTime: z.number().optional(),
    lastPasswordReset: z.number().optional(),
    tfaEnabled: z.boolean().optional(),
    activeSyncEnabled: z.boolean().optional(),
    imapAccessEnabled: z.boolean().optional(),
    popAccessEnabled: z.boolean().optional(),
    smtpStatus: z.boolean().optional(),
    webBlocked: z.boolean().optional(),
    incomingBlocked: z.boolean().optional(),
    outgoingBlocked: z.boolean().optional(),
    popBlocked: z.boolean().optional(),
    imapBlocked: z.boolean().optional(),
    spamcheckEnabled: z.boolean().optional(),
    deleteCopy: z.boolean().optional(),
    mobileNumber: z.string().optional(),
    phoneNumber: z.string().optional(),
    address: AddressSchema.optional(),
    lastClient: z.string().optional(),
    planType: z.number().optional(),
    planStorage: z.number().optional(),
    popFetchTime: z.number().optional(),
    userExpiry: z.number().optional(),
    isLogoExist: z.boolean().optional(),
    mxStatus: z.boolean().optional(),
    mailForward: z.array(MailForwardSchema).optional(),
    vacationResponse: z.array(VacationResponseSchema).optional(),
    sendMailDetails: z.array(SendMailDetailSchema).optional()
});

const OutputSchema = z.object({
    accounts: z.array(AccountSchema)
});

const action = createAction({
    description: 'List all accounts for the authenticated user in Zoho Mail.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-accounts',
        group: 'Accounts'
    },
    input: z.object({}),
    output: OutputSchema,
    scopes: ['ZohoMail.accounts.READ'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.zoho.com/mail/help/api/get-all-users-accounts.html
            endpoint: '/api/accounts',
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        if (parsed.status.code !== 200) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: `Zoho Mail API returned status ${parsed.status.code}: ${parsed.status.description}`
            });
        }

        const accounts = parsed.data.map((account) => {
            const mappedAccount: z.infer<typeof AccountSchema> = {
                accountId: account.accountId,
                ...(account.accountDisplayName != null && { accountDisplayName: account.accountDisplayName }),
                ...(account.accountName != null && { accountName: account.accountName }),
                ...(account.displayName != null && { displayName: account.displayName }),
                ...(account.emailAddress !== undefined && { emailAddress: account.emailAddress }),
                ...(account.enabled !== undefined && { enabled: account.enabled }),
                ...(account.incomingUserName != null && { incomingUserName: account.incomingUserName }),
                ...(account.lastLogin !== undefined && { lastLogin: account.lastLogin }),
                ...(account.mailboxAddress != null && { mailboxAddress: account.mailboxAddress }),
                ...(account.primaryEmailAddress != null && { primaryEmailAddress: account.primaryEmailAddress }),
                ...(account.role != null && { role: account.role }),
                ...(account.sequence !== undefined && { sequence: account.sequence }),
                ...(account.status !== undefined && { status: account.status }),
                ...(account.type !== undefined && { type: account.type }),
                ...(account.zuid !== undefined && { zuid: account.zuid }),
                ...(account.URI !== undefined && { uri: account.URI }),
                ...(account.country != null && { country: account.country }),
                ...(account.language != null && { language: account.language }),
                ...(account.timeZone != null && { timeZone: account.timeZone }),
                ...(account.mailboxStatus != null && { mailboxStatus: account.mailboxStatus }),
                ...(account.firstName != null && { firstName: account.firstName }),
                ...(account.lastName != null && { lastName: account.lastName }),
                ...(account.gender != null && { gender: account.gender }),
                ...(account.allowedStorage !== undefined && { allowedStorage: account.allowedStorage }),
                ...(account.usedStorage !== undefined && { usedStorage: account.usedStorage }),
                ...(account.basicStorage != null && { basicStorage: account.basicStorage }),
                ...(account.accountCreationTime !== undefined && { accountCreationTime: account.accountCreationTime }),
                ...(account.mailboxCreationTime !== undefined && { mailboxCreationTime: account.mailboxCreationTime }),
                ...(account.lastPasswordReset !== undefined && { lastPasswordReset: account.lastPasswordReset }),
                ...(account.tfaEnabled !== undefined && { tfaEnabled: account.tfaEnabled }),
                ...(account.activeSyncEnabled !== undefined && { activeSyncEnabled: account.activeSyncEnabled }),
                ...(account.imapAccessEnabled !== undefined && { imapAccessEnabled: account.imapAccessEnabled }),
                ...(account.popAccessEnabled !== undefined && { popAccessEnabled: account.popAccessEnabled }),
                ...(account.smtpStatus !== undefined && { smtpStatus: account.smtpStatus }),
                ...(account.webBlocked !== undefined && { webBlocked: account.webBlocked }),
                ...(account.incomingBlocked !== undefined && { incomingBlocked: account.incomingBlocked }),
                ...(account.outgoingBlocked !== undefined && { outgoingBlocked: account.outgoingBlocked }),
                ...(account.popBlocked !== undefined && { popBlocked: account.popBlocked }),
                ...(account.imapBlocked !== undefined && { imapBlocked: account.imapBlocked }),
                ...(account.spamcheckEnabled !== undefined && { spamcheckEnabled: account.spamcheckEnabled }),
                ...(account.deleteCopy !== undefined && { deleteCopy: account.deleteCopy }),
                ...(account.mobileNumber != null && { mobileNumber: account.mobileNumber }),
                ...(account.phoneNumer != null && { phoneNumber: account.phoneNumer }),
                ...(account.address !== undefined && { address: account.address }),
                ...(account.lastClient != null && { lastClient: account.lastClient }),
                ...(account.planType !== undefined && { planType: account.planType }),
                ...(account.planStorage !== undefined && { planStorage: account.planStorage }),
                ...(account.popFetchTime !== undefined && { popFetchTime: account.popFetchTime }),
                ...(account.userExpiry !== undefined && { userExpiry: account.userExpiry }),
                ...(account.isLogoExist !== undefined && { isLogoExist: account.isLogoExist }),
                ...(account.mxStatus !== undefined && { mxStatus: account.mxStatus }),
                ...(account.mailForward !== undefined && { mailForward: account.mailForward }),
                ...(account.vacationResponse !== undefined && { vacationResponse: account.vacationResponse }),
                ...(account.sendMailDetails !== undefined && { sendMailDetails: account.sendMailDetails })
            };
            return mappedAccount;
        });

        return {
            accounts
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
