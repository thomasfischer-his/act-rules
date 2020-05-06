'use strict';

import { ACTRuleResult } from '@qualweb/act-rules';
import { AccessibilityUtils } from '@qualweb/util';
import Rule from '../lib/Rule.object';
import { ACTRule, ElementExists } from '../lib/decorator';
import {QWElement} from "@qualweb/qw-element";
import {QWPage} from "@qualweb/qw-page";

@ACTRule
class QW_ACT_R35 extends Rule {

  constructor(rule?: any) {
    super(rule);
  }

  @ElementExists
  execute(element: QWElement, page: QWPage): void {

    const role = AccessibilityUtils.getElementRole(element, page);

    if (role !== 'heading') {
      return;
    }

    const evaluation: ACTRuleResult = {
      verdict: '',
      description: '',
      resultCode: ''
    };
    
    const isInAT = AccessibilityUtils.isElementInAT(element, page);
    if (isInAT) {
      const accessibleName = AccessibilityUtils.getAccessibleName(element, page);
      if (accessibleName) {
        evaluation.verdict = 'passed';
        evaluation.description = 'The test target has a non-empty accessible name.';
        evaluation.resultCode = 'RC1';
      } else {
        evaluation.verdict = 'failed';
        evaluation.description = `The test target accessible name doesn't exist or it's empty ("").`;
        evaluation.resultCode = 'RC2';
      }
    } else {
      evaluation.verdict = 'inapplicable';
      evaluation.description = 'The test target is not included in the accessibility tree.';
      evaluation.resultCode = 'RC3';
    }

    super.addEvaluationResult(evaluation, element);
  }
}

export = QW_ACT_R35;
