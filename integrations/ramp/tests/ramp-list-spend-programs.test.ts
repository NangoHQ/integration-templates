import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-spend-programs.js';

describe('ramp list-spend-programs tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-spend-programs',
        Model: 'ActionOutput_ramp_listspendprograms'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
