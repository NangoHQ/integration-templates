import * as z from 'zod';

export const Address = z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    country: z.string(),
    postalCode: z.string(),
    type: z.union([z.literal('HOME'), z.literal('WORK')])
});

export type Address = z.infer<typeof Address>;

export const Phone = z.object({
    type: z.union([z.literal('WORK'), z.literal('HOME'), z.literal('MOBILE')]),
    number: z.string()
});

export type Phone = z.infer<typeof Phone>;

export const Email = z.object({
    type: z.union([z.literal('WORK'), z.literal('PERSONAL')]),
    address: z.string()
});

export type Email = z.infer<typeof Email>;

export const Person = z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string()
});

export type Person = z.infer<typeof Person>;

export const StandardEmployee = z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    displayName: z.string(),
    employeeNumber: z.string().optional(),
    title: z.string(),

    department: z.object({
        id: z.string(),
        name: z.string()
    }),

    employmentType: z.union([
        z.literal('FULL_TIME'),
        z.literal('PART_TIME'),
        z.literal('CONTRACTOR'),
        z.literal('INTERN'),
        z.literal('TEMPORARY'),
        z.literal('OTHER')
    ]),

    employmentStatus: z.string().optional(),
    startDate: z.string(),
    terminationDate: z.union([z.string(), z.null()]),
    terminationType: z.union([z.string(), z.null()]),
    manager: Person.optional(),

    workLocation: z.object({
        name: z.string(),
        type: z.union([z.literal('OFFICE'), z.literal('REMOTE'), z.literal('HYBRID')]),

        primaryAddress: z
            .object({
                street: z.string(),
                city: z.string(),
                state: z.string(),
                country: z.string(),
                postalCode: z.string(),
                type: z.union([z.literal('WORK'), z.literal('HOME')])
            })
            .optional()
    }),

    addresses: Address.array(),
    phones: Phone.array(),
    emails: Email.array(),
    customFields: z.record(z.string(), z.any()).optional(),
    providerSpecific: z.record(z.string(), z.any()),
    createdAt: z.string(),
    updatedAt: z.string()
});

export type StandardEmployee = z.infer<typeof StandardEmployee>;

export const models = {
    StandardEmployee: StandardEmployee
};
