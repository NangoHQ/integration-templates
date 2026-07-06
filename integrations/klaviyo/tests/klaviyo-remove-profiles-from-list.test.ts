import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/remove-profiles-from-list.js';

describe('klaviyo remove-profiles-from-list tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'remove-profiles-from-list',
        Model: 'ActionOutput_klaviyo_removeprofilesfromlist'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
