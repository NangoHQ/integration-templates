import { expect, it, describe } from 'vitest';

import createAction from '../actions/search-customers.js';

describe('squareup search-customers tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'search-customers',
        Model: 'ActionOutput_squareup_searchcustomers'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
