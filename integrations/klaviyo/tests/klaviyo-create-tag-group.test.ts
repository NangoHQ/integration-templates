import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-tag-group.js';

describe('klaviyo create-tag-group tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-tag-group',
        Model: 'ActionOutput_klaviyo_createtaggroup'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
