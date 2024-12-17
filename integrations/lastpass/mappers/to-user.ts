import type { ReturnedUser } from '../types';
import type { User } from '../../models';

export function toUser(users: ReturnedUser[]): User[] {
    return users.map((user) => ({
        id: user.username,
        firstName: user.fullname?.split(' ')[0] || '',
        lastName: user.fullname?.split(' ')[1] || '',
        email: user.username
    }));
}
