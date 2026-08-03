import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-metric-descriptor.js';

describe('dynatrace get-metric-descriptor tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-metric-descriptor',
        Model: 'ActionOutput_dynatrace_getmetricdescriptor'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
