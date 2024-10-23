import { z } from 'zod';
import {
    createContactInputSchema as CreateContactSchema,
    updateContactInputSchema as UpdateContactSchema,
    updateCompanyInputSchema as UpdateCompanySchema,
    updateDealInputSchema as UpdateDealSchema,
    updateTaskInputSchema as UpdateTaskSchema,
    createTaskInputSchema as CreateTaskSchema,
    createPropertyInputSchema as CreatePropertySchema
} from './schema.zod.js';

const typeSchema = z.union([
  z.literal("datetime"),
  z.literal("string"),
  z.literal("number"),
  z.literal("date"),
  z.literal("enumeration"),
  z.literal("bool"),
]);

const fieldTypeSchema = z.union([
  z.literal("textarea"),
  z.literal("text"),
  z.literal("date"),
  z.literal("file"),
  z.literal("number"),
  z.literal("select"),
  z.literal("radio"),
  z.literal("checkbox"),
  z.literal("booleancheckbox"),
  z.literal("calculation_equation"),
]);

export const CreateContactInputSchema = CreateContactSchema.refine(
    (data) => {
        return data.email || data.first_name || data.last_name;
    },
    {
        message: 'At least one of the following properties must be present: email, firstname, or lastname.'
    }
);

export const UpdateContactInputSchema = UpdateContactSchema.refine(
    (data) => {
        const hasEmailOrId = data.email !== undefined || data.id !== undefined;
        const hasOtherProperties = Object.keys(data).some(
            // eslint-disable-next-line @nangohq/custom-integrations-linting/no-object-casting
            (key) => key !== 'email' && key !== 'id' && data[key as keyof z.infer<typeof UpdateContactSchema>] !== undefined
        );

        return hasEmailOrId && hasOtherProperties;
    },
    {
        message: 'At least one of the following properties must be present: email or id, and at least one other property must be specified.'
    }
);

export const UpdateCompanyInputSchema = UpdateCompanySchema.refine(
    (data) => {
        const hasId = data.id !== undefined;

        // eslint-disable-next-line @nangohq/custom-integrations-linting/no-object-casting
        const hasOtherProperties = Object.keys(data).some((key) => key !== 'id' && data[key as keyof typeof UpdateCompanySchema.shape] !== undefined);

        return hasId && hasOtherProperties;
    },
    {
        message: "The 'id' property must be present and at least one other property must be specified."
    }
);

export const CreateTaskInputSchema = z.intersection(
    CreateTaskSchema,
    z.object({
        task_type: z.literal('TODO'),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
        due_date: z.string().min(1, { message: 'Due date is required.' })
    })
);

export const UpdateTaskInputSchema = z.intersection(UpdateTaskSchema, z.object({})).refine(
    (data) => {
        const hasId = data.id !== undefined;
        // eslint-disable-next-line @nangohq/custom-integrations-linting/no-object-casting
        const hasOtherProperties = Object.keys(data).some((key) => key !== 'id' && data[key as keyof z.infer<typeof UpdateTaskSchema>] !== undefined);

        return hasId && hasOtherProperties;
    },
    {
        message: "The 'id' property must be present and at least one other property must be specified."
    }
);

export const UpdateDealInputSchema = z.intersection(UpdateDealSchema, z.object({})).refine(
    (data) => {
        const hasId = data.id !== undefined;
        // eslint-disable-next-line @nangohq/custom-integrations-linting/no-object-casting
        const hasOtherProperties = Object.keys(data).some((key) => key !== 'id' && data[key as keyof z.infer<typeof UpdateDealSchema>] !== undefined);

        return hasId && hasOtherProperties;
    },
    {
        message: "The 'id' property must be present and at least one other property must be specified."
    }
);

export const CreatePropertyInputSchema = CreatePropertySchema
  .extend({
    data: CreatePropertySchema.shape.data.extend({
      type: typeSchema,
      fieldType: fieldTypeSchema,
    }),
  })
  .superRefine((data, ctx) => {
    const { type, options } = data.data;
    if (type === "enumeration" && !options) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "If the input type is enumeration, options must be provided",
        path: ["data", "options"],
      });
    }
  });
