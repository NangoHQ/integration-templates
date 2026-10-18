import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-text-box.js';

describe('google-slides create-text-box tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-text-box',
        Model: 'ActionOutput_google_slides_createtextbox'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
