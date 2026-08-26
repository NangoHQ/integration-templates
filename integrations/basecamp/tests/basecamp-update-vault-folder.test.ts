import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-vault-folder.js';

describe('basecamp update-vault-folder tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-vault-folder',
        Model: 'ActionOutput_basecamp_updatevaultfolder'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
