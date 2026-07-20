import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-app-events.js';

describe('shopify-partner list-app-events tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-app-events',
        Model: 'ActionOutput_shopify_partner_listappevents'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
