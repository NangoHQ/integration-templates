import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/describe-sobject.js';

describe('salesforce describe-sobject tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'describe-sobject',
        Model: 'ActionOutput_salesforce_describesobject'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
