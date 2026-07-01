import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/toggle-custom-tag-resource.js';

describe('instantly toggle-custom-tag-resource tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'toggle-custom-tag-resource',
        Model: 'ActionOutput_instantly_togglecustomtagresource'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
