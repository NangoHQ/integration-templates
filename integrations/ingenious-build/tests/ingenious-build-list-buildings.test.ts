import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-buildings.js';

describe('ingenious-build list-buildings tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-buildings',
        Model: 'ActionOutput_ingenious_build_listbuildings'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
