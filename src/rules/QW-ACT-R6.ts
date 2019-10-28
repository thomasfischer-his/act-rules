/**
 * Author: Bruno Andrade
 *
 * Description:
 *
 * Notes:
 *
 * Last modified: 7/10/2019
 */
'use strict';

import {DomElement} from 'htmlparser2';
import {ACTRule, ACTRuleResult} from '@qualweb/act-rules';
import {DomUtils, AccessibilityTreeUtils} from '@qualweb/util';
import Rule from './Rule.object';
import {trim} from 'lodash';

import {
  getElementSelector,
  transform_element_into_html
} from '../util';

/**
 * Technique information
 * @type {Object}
 */
const rule: ACTRule = {
  name: 'Image button has accessible name',
  code: 'QW-ACT-R6',
  mapping: '59796f',
  description: 'This rule checks that each image button element has an accessible name.',
  metadata: {
    target: {
      element: 'input',
      attributes: ['type="image"']
    },
    'success-criteria': [
      {
        name: '1.1.1',
        level: 'A',
        principle: 'Perceivable',
        url: 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content'
      },
      {
        name: '4.1.2',
        level: 'A',
        principle: 'Robust',
        url: 'https://www.w3.org/WAI/WCAG21/Understanding/name-role-value'
      }
    ],
    related: [],
    url: 'https://act-rules.github.io/rules/59796f',
    passed: 0,
    inapplicable: 0,
    warning: 0,
    failed: 0,
    type: ['ACTRule', 'TestCase'],
    a11yReq: ['WCAG21:language'],
    outcome: '',
    description: ''
  },
  results: new Array<ACTRuleResult>()
};

class QW_ACT_R6 extends Rule {

  constructor() {
    super(rule);
  }

  async execute(element: DomElement | undefined, processedHTML: DomElement[]): Promise<void> {
    const evaluation: ACTRuleResult = {
      verdict: '',
      description: '',
      resultCode: ''
    };

    let isHidden;
    let accessName;

    if (element === undefined) { // if the element doesn't exist
      evaluation.verdict = 'inapplicable';
      evaluation.description = `There isn't an image button to test`;
      evaluation.resultCode = 'RC1';
    } else {
      isHidden = DomUtils.isElementHidden(element);
      accessName = AccessibilityTreeUtils.getAccessibleName(element, processedHTML, false);
      if (isHidden) {
        evaluation.verdict = 'inapplicable';
        evaluation.description = `This image button is not included in the accessibiliy tree`;
        evaluation.resultCode = 'RC2';
      } else {
        if (accessName === undefined || trim(accessName) === '') {
          evaluation.verdict = 'failed';
          evaluation.description = `It's not possible to define the accessible name of this element`;
          evaluation.resultCode = 'RC3';
        } else {
          evaluation.verdict = 'passed';
          evaluation.description = `This image button has an accessible name`;
          evaluation.resultCode = 'RC4';
        }
      }
    }

    if (element !== undefined) {
      evaluation.code = transform_element_into_html(element);
      evaluation.pointer = getElementSelector(element);
    }

    super.addEvaluationResult(evaluation);
  }
}

export = QW_ACT_R6;