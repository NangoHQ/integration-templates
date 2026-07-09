import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-ad-groups.js';

describe('pinterest update-ad-groups tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-ad-groups',
        Model: 'ActionOutput_pinterest_updateadgroups'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
