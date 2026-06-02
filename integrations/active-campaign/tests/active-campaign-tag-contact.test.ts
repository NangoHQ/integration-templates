import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/tag-contact.js';

describe('active-campaign tag-contact tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'tag-contact',
        Model: 'ActionOutput_active_campaign_tagcontact'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
