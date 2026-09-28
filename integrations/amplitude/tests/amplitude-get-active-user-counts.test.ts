import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-active-user-counts.js';

describe('amplitude get-active-user-counts tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-active-user-counts',
        Model: 'ActionOutput_amplitude_getactiveusercounts'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
