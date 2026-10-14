import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-bill-drafts.js';

describe('ramp-sandbox list-bill-drafts tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-bill-drafts',
        Model: 'ActionOutput_ramp_sandbox_listbilldrafts'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
