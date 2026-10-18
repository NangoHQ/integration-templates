import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-slide-with-content.js';

describe('google-slides create-slide-with-content tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-slide-with-content',
        Model: 'ActionOutput_google_slides_createslidewithcontent'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
