import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-presentation.js';

describe('google-slides create-presentation tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-presentation',
        Model: 'ActionOutput_google_slides_createpresentation'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
