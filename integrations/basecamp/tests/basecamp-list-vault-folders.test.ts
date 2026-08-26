import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-vault-folders.js';

describe('basecamp list-vault-folders tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-vault-folders',
        Model: 'ActionOutput_basecamp_listvaultfolders'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
