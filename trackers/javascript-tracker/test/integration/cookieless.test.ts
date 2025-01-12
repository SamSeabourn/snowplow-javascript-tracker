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

import util from 'util';
import F from 'lodash/fp';
import { DockerWrapper, fetchResults, start, stop } from '../micro';

const dumpLog = (log: Array<unknown>) => console.log(util.inspect(log, true, null, true));

const retrieveSchemaData = (schema: unknown) => F.compose(F.get('data'), F.find({ schema }), F.get('data'));

describe('Anonymous tracking features', () => {
  let log: Array<unknown> = [];
  let docker: DockerWrapper;

  const listContains = (items: Array<unknown>, ev: unknown) => F.some(F.isMatch(ev as object), items);

  beforeAll(async () => {
    await browser.call(async () => (docker = await start()));
    await browser.url('/index.html');
    await browser.setCookies({ name: 'container', value: docker.url });
    await browser.url('/cookieless.html');
    await browser.pause(5000); // Time for requests to get written
    await browser.url('/cookieless.html?ieTest=true');
    await browser.pause(2500); // Time for requests to get written

    log = await browser.call(async () => await fetchResults(docker.url));
  });

  afterAll(async () => {
    await browser.call(async () => await stop(docker.container));
  });

  it('should have no user information in page view when server anonymisation ', () => {
    const expected = {
      event: 'page_view',
      app_id: 'anon',
      page_title: 'Server Anon',
      user_id: null,
      domain_userid: null,
      domain_sessionidx: null,
      domain_sessionid: null,
    };

    const pageViews = F.filter(
      (ev) =>
        F.get('event.event', ev) === 'page_view' &&
        F.get('event.app_id', ev) === 'anon' &&
        F.get('event.page_title', ev) === 'Server Anon',
      log
    );

    expect(F.size(pageViews)).toBe(2);

    // We should still get these events in IE9,
    // but they will be sent with the non-anonymous events
    if (F.isMatch({ browserName: 'internet explorer', version: '9' }, browser.capabilities)) {
      expect(
        listContains(pageViews, {
          event: expected,
        })
      ).toBe(true);
    } else {
      // All other browsers we support
      expect(
        listContains(pageViews, {
          event: {
            ...expected,
            user_ipaddress: 'unknown',
            network_userid: '00000000-0000-0000-0000-000000000000',
          },
        })
      ).toBe(true);
    }
  });

  it('should have user information in page view when no anonymisation ', () => {
    const pageViews = F.filter(
      (ev) =>
        F.get('event.event', ev) === 'page_view' &&
        F.get('event.app_id', ev) === 'anon' &&
        F.get('event.page_title', ev) === 'No Anon',
      log
    );

    expect(
      listContains(pageViews, {
        event: {
          event: 'page_view',
          app_id: 'anon',
          page_title: 'No Anon',
          user_id: 'Malcolm',
        },
      })
    ).toBe(true);

    expect(F.size(pageViews)).toBe(1);

    expect(F.get('event.domain_userid', pageViews[0])).not.toBeNull();
    expect(F.get('event.domain_sessionidx', pageViews[0])).not.toBeNull();
    expect(F.get('event.domain_sessionid', pageViews[0])).not.toBeNull();
    expect(F.get('event.network_userid', pageViews[0])).not.toBeNull();
    expect(F.get('event.user_ipaddress', pageViews[0])).not.toBe('unknown');
  });

  it('should have no client user information in page view when client anonymisation', () => {
    const pageViews = F.filter(
      (ev) =>
        F.get('event.event', ev) === 'page_view' &&
        F.get('event.app_id', ev) === 'anon' &&
        F.get('event.page_title', ev) === 'Client Anon',
      log
    );

    expect(
      listContains(pageViews, {
        event: {
          event: 'page_view',
          app_id: 'anon',
          page_title: 'Client Anon',
          user_id: null,
          domain_userid: null,
          domain_sessionidx: null,
          domain_sessionid: null,
        },
      })
    ).toBe(true);

    expect(F.size(pageViews)).toBe(1);

    // IP should be tracked as only client side
    expect(F.get('event.user_ipaddress', pageViews[0])).not.toBe('unknown');
  });

  it('Check pageViewId is regenerated for each trackPageView', () => {
    const pageViews = F.filter(
      (ev) => F.get('event.event', ev) === 'page_view' && F.get('event.name_tracker', ev) === 'sp',
      log
    );

    const getWebPageId = F.compose(
      F.get('id'),
      retrieveSchemaData('iglu:com.snowplowanalytics.snowplow/web_page/jsonschema/1-0-0'),
      F.get('event.contexts')
    );

    expect(F.size(F.groupBy(getWebPageId, pageViews))).toBeGreaterThanOrEqual(2);
  });

  it('should send no events in IE9 when server anonymisation is enabled', () => {
    const pageViews = F.filter(
      (ev) => F.get('event.event', ev) === 'page_view' && F.get('event.app_id', ev) === 'ie',
      log
    );

    // Unable to send anonymous header on IE 9, so we don't send anything
    if (F.isMatch({ browserName: 'internet explorer', version: '9' }, browser.capabilities)) {
      expect(F.size(pageViews)).toBe(0);
    } else {
      expect(F.size(pageViews)).toBe(2);
    }
  });
});
