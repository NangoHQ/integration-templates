import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-profiles-to-list.js';

describe('klaviyo add-profiles-to-list tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-profiles-to-list',
        Model: 'ActionOutput_klaviyo_addprofilestolist'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
