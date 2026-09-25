import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-revenue-ltv.js';

describe('amplitude get-revenue-ltv tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-revenue-ltv',
        Model: 'ActionOutput_amplitude_getrevenueltv'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
