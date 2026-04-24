import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-cycles.js';

describe('linear list-cycles tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-cycles',
        Model: 'ActionOutput_linear_listcycles'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
