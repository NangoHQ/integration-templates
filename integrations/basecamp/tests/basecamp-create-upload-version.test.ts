import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-upload-version.js';

describe('basecamp create-upload-version tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-upload-version',
        Model: 'ActionOutput_basecamp_createuploadversion'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
