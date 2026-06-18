import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-event-type.js';

describe('amplitude get-event-type tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-event-type',
        Model: 'ActionOutput_amplitude_geteventtype'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
