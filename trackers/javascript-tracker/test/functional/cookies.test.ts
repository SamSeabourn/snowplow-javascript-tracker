/*
 * Copyright (c) 2022 Snowplow Analytics Ltd, 2010 Anthon Pang
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its
 *    contributors may be used to endorse or promote products derived from
 *    this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

describe('Tracker created domain cookies', () => {
  it('contain the expected cookie names', async () => {
    await browser.url('/cookies.html');
    await browser.waitUntil(async () => (await $('#init').getText()) === 'true', {
      timeout: 5000,
      timeoutMsg: 'expected init after 5s',
      interval: 250,
    });

    await browser.waitUntil(async () => (await $('#cookies').getText()) !== '', {
      timeout: 5000,
      timeoutMsg: 'expected cookie to be set after 5s',
      interval: 250,
    });

    const cookies = await $('#cookies').getText();

    expect(cookies).not.toContain('_sp_0ses.'); // Missing as tests are not HTTPS and `cookieSecure: true` by default
    expect(cookies).not.toContain('_sp_0id.');
    expect(cookies).not.toContain('_sp_3ses.'); // Missing as cookie lifetime is too short (1)
    expect(cookies).not.toContain('_sp_3id.');
    expect(cookies).not.toContain('_sp_4ses.'); // Missing as anonymous tracking enabled
    expect(cookies).not.toContain('_sp_4id.');
    expect(cookies).not.toContain('_sp_5ses.'); // Missing as only using local storage
    expect(cookies).not.toContain('_sp_5id.');
    expect(cookies).not.toContain('_sp_7ses.'); // Can't set a cookie for another domain
    expect(cookies).not.toContain('_sp_7id.');

    expect(cookies).toContain('_sp_1ses.');
    expect(cookies).toContain('_sp_1id.');
    expect(cookies).toContain('_sp_2ses.');
    expect(cookies).toContain('_sp_2id.');
    expect(cookies).toContain('_sp_6ses.');
    expect(cookies).toContain('_sp_6id.');

    expect(await $('#getDomainUserId').getText()).toMatch(
      /\b[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}\b/i
    );
    expect(await $('#getDomainUserInfo').getText()).toMatch(
      /\b[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}\b.[0-9]+.[0-9].[0-9]+.[0-9]*.\b[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}\b.(\b[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}\b)?.(\b[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}\b)?.[0-9]*.[0-9]+/i
    );
    expect(await $('#getUserId').getText()).toBe('Dave');
    expect(await $('#getCookieName').getText()).toMatch(/_sp_1id.[0-9a-z]{4}/i);
    expect(await $('#getPageViewId').getText()).toMatch(
      /\b[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}\b/i
    );
  });
});
