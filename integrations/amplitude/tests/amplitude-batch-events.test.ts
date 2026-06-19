import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/batch-events.js';

describe('amplitude batch-events tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'batch-events',
        Model: 'ActionOutput_amplitude_batchevents'
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
