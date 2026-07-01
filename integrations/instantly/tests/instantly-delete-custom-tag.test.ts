import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-custom-tag.js';

describe('instantly delete-custom-tag tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-custom-tag',
        Model: 'ActionOutput_instantly_deletecustomtag'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
