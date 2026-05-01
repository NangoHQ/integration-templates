import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-shared-link.js';

describe('dropbox create-shared-link tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-shared-link',
        Model: 'ActionOutput_dropbox_createsharedlink'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
