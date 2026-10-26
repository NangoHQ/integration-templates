import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-text.js';

describe('google-slides delete-text tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-text',
        Model: 'ActionOutput_google_slides_deletetext'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
