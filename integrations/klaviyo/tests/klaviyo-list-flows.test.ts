import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-flows.js';

describe('klaviyo list-flows tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-flows',
        Model: 'ActionOutput_klaviyo_listflows'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
