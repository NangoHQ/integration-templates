import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/restore-folder.js';

describe('wrike restore-folder tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'restore-folder',
        Model: 'ActionOutput_wrike_restorefolder'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
