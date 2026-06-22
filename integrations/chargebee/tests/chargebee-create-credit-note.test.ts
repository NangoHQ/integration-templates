import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-credit-note.js';

describe('chargebee create-credit-note tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-credit-note',
        Model: 'ActionOutput_chargebee_createcreditnote'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
