import { vi, expect, it, describe } from 'vitest';

import createAction, { type NangoActionLocal } from '../actions/clear-calendar.js';

describe('google-calendar clear-calendar tests', () => {
    it('should clear the primary calendar by default', async () => {
        const post = vi.fn().mockResolvedValue({});
        const nangoMock = { post } as unknown as NangoActionLocal;

        const response = await createAction.exec(nangoMock, {});

        expect(post).toHaveBeenCalledWith({
            endpoint: '/calendar/v3/calendars/primary/clear',
            retries: 3
        });
        expect(response).toEqual({
            success: true,
            calendarId: 'primary'
        });
    });

    it('should clear the requested calendar', async () => {
        const post = vi.fn().mockResolvedValue({});
        const nangoMock = { post } as unknown as NangoActionLocal;
        const calendarId = 'team+events@example.com';
        const response = await createAction.exec(nangoMock, { calendarId });

        expect(post).toHaveBeenCalledWith({
            endpoint: '/calendar/v3/calendars/team%2Bevents%40example.com/clear',
            retries: 3
        });
        expect(response).toEqual({
            success: true,
            calendarId
        });
    });
});
