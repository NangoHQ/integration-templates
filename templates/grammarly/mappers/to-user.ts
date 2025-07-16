import type { User } from ../models.js;

interface GrammarlyUser {
    user_id: string;
    name: string;
    email: string;
}

export function toUser(user: GrammarlyUser): User {
    const nameParts = (user.name || '').split(' ').filter(Boolean);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ');

    return {
        id: user.user_id,
        firstName,
        lastName,
        email: user.email,
        __raw: user
    };
}
