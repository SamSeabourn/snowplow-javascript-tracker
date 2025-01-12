/*
 * Copyright (c) 2022 Snowplow Analytics Ltd
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

import { trackerCore, PayloadBuilder, TrackerCore, version } from '@snowplow/tracker-core';

import { Emitter } from './emitter';

export interface Tracker extends TrackerCore {
  /**
   * Set the domain user ID
   *
   * @param userId - The domain user id
   */
  setDomainUserId: (userId: string) => void;

  /**
   * Set the network user ID
   *
   * @param userId - The network user id
   */
  setNetworkUserId: (userId: string) => void;
}

/**
 * Snowplow Node.js Tracker
 *
 * @param string - or array emitters The emitter or emitters to which events will be sent
 * @param string - namespace The namespace of the tracker
 * @param string - appId The application ID
 * @param boolean - encodeBase64 Whether unstructured events and custom contexts should be base 64 encoded
 */
export function tracker(
  emitters: Emitter | Array<Emitter>,
  namespace: string,
  appId: string,
  encodeBase64: boolean
): Tracker {
  let domainUserId: string;
  let networkUserId: string;
  let allEmitters: Array<Emitter>;

  if (Array.isArray(emitters)) {
    allEmitters = emitters;
  } else {
    allEmitters = [emitters];
  }

  encodeBase64 = encodeBase64 !== false;

  const addUserInformation = (payload: PayloadBuilder): void => {
    payload.add('duid', domainUserId);
    payload.add('nuid', networkUserId);
  };

  /**
   * Send the payload for an event to the endpoint
   *
   * @param payload - Dictionary of name-value pairs for the querystring
   */
  const sendPayload = (payload: PayloadBuilder): void => {
    addUserInformation(payload);
    const builtPayload = payload.build();
    for (let i = 0; i < allEmitters.length; i++) {
      allEmitters[i].input(builtPayload);
    }
  };

  const core = trackerCore({ base64: encodeBase64, callback: sendPayload });

  core.setPlatform('srv'); // default platform
  core.setTrackerVersion('node-' + version);
  core.setTrackerNamespace(namespace);
  core.setAppId(appId);

  const setDomainUserId = function (userId: string) {
    domainUserId = userId;
  };

  const setNetworkUserId = function (userId: string) {
    networkUserId = userId;
  };

  return {
    setDomainUserId,
    setNetworkUserId,
    ...core,
  };
}
