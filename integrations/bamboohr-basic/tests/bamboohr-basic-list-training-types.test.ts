import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-training-types.js';

describe('bamboohr list-training-types tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-training-types',
        Model: 'ActionOutput_bamboohr_listtrainingtypes'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
