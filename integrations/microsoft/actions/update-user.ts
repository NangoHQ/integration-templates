import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('The unique identifier of the user to update. Example: "9fc4580d-5ed8-46c5-9fff-258fd68d533d"'),
    displayName: z.string().optional().describe('The name displayed in the address book for the user.'),
    givenName: z.string().optional().describe('The given name (first name) of the user.'),
    surname: z.string().optional().describe('The surname (family name or last name) of the user.'),
    jobTitle: z.string().optional().describe('The job title of the user.'),
    department: z.string().optional().describe('The name of the department in which the user works.'),
    officeLocation: z.string().optional().describe("The office location in the user's place of business."),
    mobilePhone: z.string().optional().describe('The primary cellular telephone number for the user.'),
    businessPhones: z.array(z.string()).optional().describe('The telephone numbers for the user.'),
    city: z.string().optional().describe('The city in which the user is located.'),
    country: z.string().optional().describe('The country/region in which the user is located.'),
    preferredLanguage: z.string().optional().describe('The preferred language for the user. Should follow ISO 639-1 Code; for example, "en-US".'),
    mailNickname: z.string().optional().describe('The mail alias for the user.'),
    accountEnabled: z.boolean().optional().describe('true if the account is enabled; otherwise, false.')
});

const OutputSchema = z.object({
    success: z.boolean(),
    userId: z.string()
});

const action = createAction({
    description: 'Update a user in Microsoft Entra ID',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-user',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['User.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const updateData: Record<string, unknown> = {};

        if (input.displayName !== undefined) {
            updateData['displayName'] = input.displayName;
        }
        if (input.givenName !== undefined) {
            updateData['givenName'] = input.givenName;
        }
        if (input.surname !== undefined) {
            updateData['surname'] = input.surname;
        }
        if (input.jobTitle !== undefined) {
            updateData['jobTitle'] = input.jobTitle;
        }
        if (input.department !== undefined) {
            updateData['department'] = input.department;
        }
        if (input.officeLocation !== undefined) {
            updateData['officeLocation'] = input.officeLocation;
        }
        if (input.mobilePhone !== undefined) {
            updateData['mobilePhone'] = input.mobilePhone;
        }
        if (input.businessPhones !== undefined) {
            updateData['businessPhones'] = input.businessPhones;
        }
        if (input.city !== undefined) {
            updateData['city'] = input.city;
        }
        if (input.country !== undefined) {
            updateData['country'] = input.country;
        }
        if (input.preferredLanguage !== undefined) {
            updateData['preferredLanguage'] = input.preferredLanguage;
        }
        if (input.mailNickname !== undefined) {
            updateData['mailNickname'] = input.mailNickname;
        }
        if (input.accountEnabled !== undefined) {
            updateData['accountEnabled'] = input.accountEnabled;
        }

        if (Object.keys(updateData).length === 0) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one property to update must be provided'
            });
        }

        // https://learn.microsoft.com/en-us/graph/api/user-update
        await nango.patch({
            endpoint: `/v1.0/users/${encodeURIComponent(input.userId)}`,
            data: updateData,
            retries: 3
        });

        return {
            success: true,
            userId: input.userId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
