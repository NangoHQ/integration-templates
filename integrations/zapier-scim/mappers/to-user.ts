import type { User } from '../../models';
import type { ScimUser } from '../types';

export function toUser(ScimUser: ScimUser): User {
    return {
        id: ScimUser.id,
        email: ScimUser.emails.find((email) => email.primary)?.value ?? '',
        firstName: ScimUser.name.givenName,
        lastName: ScimUser.name.familyName
    };
}
