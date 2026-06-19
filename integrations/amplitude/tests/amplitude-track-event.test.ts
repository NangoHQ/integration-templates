import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/track-event.js';

describe('amplitude track-event tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'track-event',
        Model: 'ActionOutput_amplitude_trackevent'
    });

    it('should output the action output that is expected', async () => {
        nangoMock.getConnection.mockResolvedValue({
            credentials: {
                type: 'BASIC',
                username: '50219ec150a6a7cbb8c0302461ca40de'
            }
        });
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
