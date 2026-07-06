import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/patch-lead-list.js';

describe('instantly patch-lead-list tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'patch-lead-list',
        Model: 'ActionOutput_instantly_patchleadlist'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
