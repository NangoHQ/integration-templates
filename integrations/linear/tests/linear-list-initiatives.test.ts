import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-initiatives.js';

describe('linear list-initiatives tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-initiatives',
        Model: 'ActionOutput_linear_listinitiatives'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
