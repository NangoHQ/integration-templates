import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-time-off-types.js';

describe('bamboohr list-time-off-types tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-time-off-types',
        Model: 'ActionOutput_bamboohr_listtimeofftypes'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
