import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-event-type.js';

describe('amplitude update-event-type tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-event-type',
        Model: 'ActionOutput_amplitude_updateeventtype'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
