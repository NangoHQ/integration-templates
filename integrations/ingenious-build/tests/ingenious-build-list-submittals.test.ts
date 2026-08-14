import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-submittals.js';

describe('ingenious-build list-submittals tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-submittals',
        Model: 'ActionOutput_ingenious_build_listsubmittals'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
