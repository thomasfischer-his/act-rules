'use strict';

import { DomElement } from 'htmlparser2';
import _ from 'lodash';

import { ACTRule, ACTResult } from '@qualweb/act-rules';

import {
  getElementSelector,
  transform_element_into_html
} from './../util';

import languages from './language.json';

const rule: ACTRule = {
  'name': 'HTML lang and xml:lang match',
  'code': 'R13',
  'description': 'The rule checks that for the html element, there is no mismatch between the primary language in non-empty lang and xml:lang attributes, if both are used.',
  'metadata': {
    'target': {
      'element': 'html',
      'attributes': 'lang, xml:lang'
    },
    'success-criteria': [{
      'name': '3.1.1',
      'level': 'A',
      'principle': 'Understandable'
    }],
    'related': [],
    'url': 'https://auto-wcag.github.io/auto-wcag/rules/SC3-1-1-html-xml-lang-match.html',
    'passed': 0,
    'notApplicable': 0,
    'failed': 0,
    'type': ['ACTRule', 'TestCase'],
    'a11yReq': ['WCAG21:language'],
    'outcome': '',
    'description': ''
  },
  'results': new Array<ACTResult>()
};

function hasPrincipleAndLevels(principles: string[], levels: string[]): boolean {
  let has = false;
  for (let sc of rule.metadata['success-criteria'] || []) {
    if (principles.includes(sc.principle) && levels.includes(sc.level)) {
      has = true;
    }
  }
  return has;
}

async function execute(element: DomElement | undefined, processedHTML: DomElement[]): Promise<void> {
   const evaluation: ACTResult = {
    verdict: '',
    description: '',
    code: '',
    pointer: ''
  };

  let url = rule.metadata['url'];
  evaluation['test'] = url;


  if (element === undefined) { // if the element doesn't exist, there's nothing to test
    evaluation.verdict = 'notApplicable';
    evaluation.description = 'html element doesn\'t exist';
    rule.metadata.notApplicable++;
  } else if (element.parent !== null) {
    evaluation.verdict = 'notApplicable';
    evaluation.description = 'html element is not the root element of the page';
    rule.metadata.notApplicable++;
  } else if (element.attribs === undefined) {
    evaluation.verdict = 'notApplicable';
    evaluation.description = `html element doesn't have attributes`;
    rule.metadata.notApplicable++;
  } else if (element.attribs['lang'] === undefined || element.attribs['xml:lang'] === undefined) {
    evaluation.verdict = 'notApplicable';
    evaluation.description = `lang or xml:lang attribute doesn't exist in html element`;
    rule.metadata.notApplicable++;
  } else if (element.attribs['lang'] === '' || element.attribs['xml:lang'] === '') {
    evaluation.verdict = 'notApplicable';
    evaluation.description = 'lang or xml:lang attribute is empty in html element';
    rule.metadata.notApplicable++;
  }

  if (rule.metadata.notApplicable === 0 && element && element.attribs) {
    let lang = element.attribs['lang'].split('-')[0];
    let xmllang = element.attribs['xml:lang'].split('-')[0];

    let validLang = isSubTagValid(lang.toLowerCase());
    let validXMLLang = isSubTagValid(xmllang.toLowerCase());

    if (!validLang || !validXMLLang) {
      evaluation.verdict = 'notApplicable';
      evaluation.description = 'lang or xml:lang element is not valid';
      rule.metadata.notApplicable++;
    }
    // from now on, we know that both tags are valid
    else if (lang === xmllang) {
      evaluation.verdict = 'passed';
      evaluation.description = 'lang and xml:lang attributes have the same value';
      rule.metadata.passed++;
    } else if (lang.toLowerCase() === xmllang.toLowerCase()) {
      evaluation.verdict = 'passed';
      evaluation.description = 'lang and xml:lang attributes have the same value';
      rule.metadata.passed++;
    } else {
      // if lang and xml:lang are different
      evaluation.verdict = 'failed';
      evaluation.description = 'lang and xml:lang attributes do not have the same value';
      rule.metadata.failed++;
    }
  }

  if (element !== undefined) {
    evaluation.code = transform_element_into_html(element);
    evaluation.pointer = getElementSelector(element);
  }

  rule.results.push(_.clone(evaluation));
}

function getFinalResults() {
  outcomeRule();
  return _.cloneDeep(rule);
}

function reset(): void {
  rule.metadata.passed = 0;
  rule.metadata.failed = 0;
  rule.metadata.notApplicable = 0;
  rule.results = new Array<ACTResult>();
}

function outcomeRule(): void {
  if (rule.metadata.failed > 0) {
    rule.metadata.outcome = 'failed';
  } else if (rule.metadata.passed > 0) {
    rule.metadata.outcome = 'passed';
  } else {
    rule.metadata.outcome = 'notApplicable';
  }

  if (rule.results.length > 0) {
    addDescription();
  }
}

function addDescription(): void {
  for (const result of rule.results || []) {    
    if (result.verdict === rule.metadata.outcome) {
      rule.metadata.description = result.description;
      break;
    }
  }
}

function isSubTagValid(subtag: string) {
  return languages.hasOwnProperty(subtag);
};

export {
  hasPrincipleAndLevels,
  execute,
  getFinalResults,
  reset
};