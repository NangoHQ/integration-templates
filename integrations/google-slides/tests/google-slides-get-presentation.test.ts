import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-presentation.js';

describe('google-slides get-presentation tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-presentation',
        Model: 'ActionOutput_google_slides_getpresentation'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
