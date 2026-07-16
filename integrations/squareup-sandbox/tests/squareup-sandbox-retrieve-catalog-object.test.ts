import { expect, it, describe } from 'vitest';

import createAction from '../actions/retrieve-catalog-object.js';

describe('squareup-sandbox retrieve-catalog-object tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'retrieve-catalog-object',
        Model: 'ActionOutput_squareup_sandbox_retrievecatalogobject'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
