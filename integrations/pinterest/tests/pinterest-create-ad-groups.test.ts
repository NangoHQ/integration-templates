import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-ad-groups.js';

describe('pinterest create-ad-groups tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-ad-groups',
        Model: 'ActionOutput_pinterest_createadgroups'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
