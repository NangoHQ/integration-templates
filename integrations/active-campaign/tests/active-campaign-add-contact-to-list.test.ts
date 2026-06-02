import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-contact-to-list.js';

describe('active-campaign add-contact-to-list tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-contact-to-list',
        Model: 'ActionOutput_active_campaign_addcontacttolist'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
