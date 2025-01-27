import type { User } from '../../models';
import type { ZapierUser } from '../types';

export function toUser(ScimUser: ZapierUser): User {
    return {
        id: ScimUser.id,
        email: ScimUser.emails.find((email) => email.primary)?.value ?? '',
        firstName: ScimUser.name.givenName ?? '',
        lastName: ScimUser.name.familyName ?? ''
    };
}
