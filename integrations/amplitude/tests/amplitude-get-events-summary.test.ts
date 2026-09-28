import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-events-summary.js';

describe('amplitude get-events-summary tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-events-summary',
        Model: 'ActionOutput_amplitude_geteventssummary'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
