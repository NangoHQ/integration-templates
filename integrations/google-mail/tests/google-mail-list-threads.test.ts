import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-threads.js';

describe('google-mail list-threads tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-threads',
        Model: 'ActionOutput_google_mail_listthreads'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });

    it('sends each labelIds value as its own query param', async () => {
        // @ts-expect-error - stubbing one response to inspect the request
        nangoMock.get.mockResolvedValueOnce({ data: {} });

        await createAction.exec(nangoMock, { labelIds: ['INBOX', 'UNREAD'], maxResults: 5 });

        expect(nangoMock.get).toHaveBeenLastCalledWith(expect.objectContaining({ params: 'labelIds=INBOX&labelIds=UNREAD&maxResults=5' }));
    });
});
