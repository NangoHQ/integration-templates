import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-group-rules.js';

describe('okta list-group-rules tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-group-rules',
        Model: 'ActionOutput_okta_cc_listgrouprules'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
