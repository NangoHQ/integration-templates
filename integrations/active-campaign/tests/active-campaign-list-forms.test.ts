import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-forms.js';

describe('active-campaign list-forms tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-forms',
        Model: 'ActionOutput_active_campaign_listforms'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
