import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-annotation.js';

describe('mixpanel create-annotation tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-annotation',
        Model: 'ActionOutput_mixpanel_createannotation'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
