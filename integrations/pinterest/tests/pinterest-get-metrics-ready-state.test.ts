import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-metrics-ready-state.js';

describe('pinterest get-metrics-ready-state tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-metrics-ready-state',
        Model: 'ActionOutput_pinterest_getmetricsreadystate'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
