'use strict';

import { ElementHandle, Page } from 'puppeteer';
import Rule from './Rule.object';
import { ACTRule, ACTRuleResult } from '@qualweb/act-rules';
import { DomUtils } from '@qualweb/util';
const request = require('request-promise');

const rule: ACTRule = {
  name: 'video element auditory content has accessible alternative',
  code: 'QW-ACT-R26',
  mapping: 'eac66b',
  description: 'This rule checks that video elements have an alternative for information conveyed through audio.',
  metadata: {
    target: {
      element: 'video'
    },
    'success-criteria': [
      {
        name: '1.2.2',
        level: 'A',
        principle: 'Perceivable ',
        url: 'https://www.w3.org/WAI/WCAG21/Understanding/captions-prerecorded.html'
      }
    ],
    related: [],
    url: 'https://act-rules.github.io/rules/eac66b',
    passed: 0,
    warning: 0,
    inapplicable: 0,
    failed: 0,
    type: ['ACTRule', 'TestCase'],
    a11yReq: ['WCAG21:language'],
    outcome: '',
    description: ''
  },
  results: new Array<ACTRuleResult>()
};

class QW_ACT_R26 extends Rule {

  constructor() {
    super(rule);
  }

  async execute(element: ElementHandle | undefined, page: Page): Promise<void> {


    const evaluation: ACTRuleResult = {
      verdict: '',
      description: '',
      resultCode: ''
    };

    if (element === undefined) {
      evaluation.verdict = 'inapplicable';
      evaluation.description = "No video element";
      evaluation.resultCode = 'RC1';
    } else {
      let track = await element.$('track[kind="captions"]')
      let isVisible = await DomUtils.isElemenVisible(element);
      let metadata = await this.getVideoMetadata(element);
      let hasPupeteerApplicableData = metadata.puppeteer.video.duration > 0 && metadata.puppeteer.audio.hasSoundTrack;
      let applicableServiceData = metadata.service.video.duration > 0 && metadata.service.audio.duration > 0 && metadata.service.audio.volume !== -91;

      if (!((metadata.service.error) || (metadata.puppeteer.error))) {
        evaluation.verdict = 'inapplicable';
        evaluation.description = "Cant colect data from the video element";
        evaluation.resultCode = 'RC1';
      } else if (isVisible && applicableServiceData) {

        if (track !== null) {
          evaluation.verdict = 'warning';
          evaluation.description = "Check if the track element correctly describes the auditive content of the video";
          evaluation.resultCode = 'RC1';
        }
        else {
          evaluation.verdict = 'warning';
          evaluation.description = "Check if the video element auditive content has accessible alternative";
          evaluation.resultCode = 'RC2';
        }
      } else if (isVisible && hasPupeteerApplicableData) {
        evaluation.verdict = 'warning';
        evaluation.description = "Video has a sound track but we can verify the volume.Check if the video has audio and if it does check if the video element auditive content has an accessible alternative";
        evaluation.resultCode = 'RC3';

      } else {
        evaluation.verdict = 'inapplicable';
        evaluation.description = "The video element isn't a non-streaming video element that is visible, where the video contains audio.";
        evaluation.resultCode = 'RC4';
      }
    }

    if (element !== undefined) {
      evaluation.htmlCode = await DomUtils.getElementHtmlCode(element);
      evaluation.pointer = await DomUtils.getElementSelector(element);
    }
    super.addEvaluationResult(evaluation);
  }

  private async getVideoMetadata(element: ElementHandle) {
    let src = await element.evaluate(elem => {
      return elem['currentSrc'];
    });
    let json = JSON.parse(await request('http://194.117.20.242/video/' + encodeURIComponent(src)));
    let durationVideo = await this.getStreamDuration(json, "video");
    let durationAudio = await this.getStreamDuration(json, "audio");
    let audioVolume = json["audio"]["maxVolume"];
    let error = json["metadata"]["error"];
    let duration = await element.evaluate(elem => { return elem['duration']; });
    let hasSoundTrack = await DomUtils.videoElementHasAudio(element);
    let result = { service: { video: { duration: {} }, audio: { duration: {}, volume: {} }, error: {} }, puppeteer: { video: { duration: {} }, audio: { hasSoundTrack: {} }, error: {} } };
    result.puppeteer.video.duration = duration;
    result.service.video.duration = durationVideo;
    result.puppeteer.audio.hasSoundTrack = hasSoundTrack;
    result.service.audio.duration = durationAudio;
    result.service.audio.volume = audioVolume
    result.service.error = error !== undefined;
    result.service.error = !(duration >= 0 && hasSoundTrack);
    return result;
  }

  private async getStreamDuration(json, streamType: string) {


    let streams = json["metadata"]["streams"];
    let duration = 0;
    if (streams) {
      for (let stream of streams) {
        if (stream["codec_type"] === streamType) {
          duration = stream["duration"]
        }
      }
    }
    return duration;
  }


}

export = QW_ACT_R26;