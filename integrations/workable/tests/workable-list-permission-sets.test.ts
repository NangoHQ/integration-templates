import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-permission-sets.js';

describe('workable list-permission-sets tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-permission-sets',
        Model: 'ActionOutput_workable_listpermissionsets'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
