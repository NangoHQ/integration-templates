import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/empty-trash.js';

describe('google-drive empty-trash tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'empty-trash',
        Model: 'ActionOutput_google_drive_emptytrash'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
