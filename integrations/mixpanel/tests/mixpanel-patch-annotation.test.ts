import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/patch-annotation.js';

describe('mixpanel patch-annotation tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'patch-annotation',
        Model: 'ActionOutput_mixpanel_patchannotation'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
