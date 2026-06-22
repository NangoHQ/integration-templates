import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/void-credit-note.js';

describe('chargebee void-credit-note tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'void-credit-note',
        Model: 'ActionOutput_chargebee_voidcreditnote'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
