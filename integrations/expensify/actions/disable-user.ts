import type { NangoAction, ExpensifyDisableUser, SuccessResponse } from '../../models';
import { getAdminPolicy } from '../helpers/policies.js';
import { getCredentials } from '../helpers/credentials.js';
import { expensifyDisableUserSchema } from '../schema.zod.js';

export default async function runAction(nango: NangoAction, input: ExpensifyDisableUser): Promise<SuccessResponse> {
    nango.zodValidate({ zodSchema: expensifyDisableUserSchema, input });
    }

    return {
        success: true
    };
}
