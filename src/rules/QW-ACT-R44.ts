'use strict';

import { ACTRuleResult } from '@qualweb/act-rules';
import { AccessibilityUtils, DomUtils } from '@qualweb/util';
import Rule from '../lib/Rule.object';
import { ACTRule, ElementExists } from '../lib/decorator';
import {QWElement} from "@qualweb/qw-element";
import {QWPage} from "@qualweb/qw-page";

@ACTRule
class QW_ACT_R44 extends Rule {

  constructor(rule?: any) {
    super(rule);
  }

  @ElementExists
  execute(element: QWElement, page: QWPage): void {

    
    const links = element.getElements('a[href], [role="link"]');
    const linkDataList = new Array<any>();

    for (const link of links || []) {
      let aName, href,context;
      if (DomUtils.isElementADescendantOf(link, page, ['svg'], [])) {
        aName = AccessibilityUtils.getAccessibleNameSVG(link, page);
      } else if(AccessibilityUtils.isElementInAT(link, page)){
        aName = AccessibilityUtils.getAccessibleName(link, page);
      }
      href = link.getElementAttribute('href');
      context = AccessibilityUtils.getLinkContext(link,page);

      if (!!aName) {
        linkDataList.push({
          context,href,aName
        })

      }
    }

    let counter = 0;
    const blacklist = new Array<number>();
    for (const linkData of linkDataList || []) {
      const evaluation: ACTRuleResult = {
        verdict: '',
        description: '',
        resultCode: ''
      };
      let elementList = new Array<QWElement>();


      if (blacklist.indexOf(counter) >= 0) {
        //element already evaluated
      } else if (!!linkData.aName && linkData.aName !== '') {
        const hasEqualAn = this.isInListExceptIndex(linkData, linkDataList, counter);
        
        if (hasEqualAn.length > 0) {

          blacklist.push(...hasEqualAn);
          let hasEqualHref = false;
          for (let index of hasEqualAn) {
            hasEqualHref = linkDataList[index].href === linkDataList[counter].href && linkDataList[counter].href !== null;
            elementList.push(links[index]);

          }
          elementList.push(links[counter]);
          if (hasEqualHref) {//passed
            evaluation.verdict = 'passed';
            evaluation.description = `The \`links\` with the same accessible name have equal content.`;
            evaluation.resultCode = 'RC2';
          } else { //warning
            evaluation.verdict = 'warning';
            evaluation.description = `The \`links\` with the same accessible name have different content. Verify is the content is equivalent.`;
            evaluation.resultCode = 'RC3';
          }
        } else {//inaplicable
          evaluation.verdict = 'inapplicable';
          evaluation.description = `Doesn't exist any other \`link\` with the same accessible name in the same link context.`;
          evaluation.resultCode = 'RC4';
        }
        super.addMultipleElementEvaluationResult(evaluation, elementList);
      } else {//inaplicable
        evaluation.verdict = 'inapplicable';
        evaluation.description = `The \`link\` doesn't have an accessible name.`;
        evaluation.resultCode = 'RC5';
        super.addMultipleElementEvaluationResult(evaluation, elementList);
      }

      counter++;
    }
  }
  private isInListExceptIndex(linkData: any, linkDataList: any[], index: number): Array<number> {
    const result = new Array<number>();
    let counter = 0;

    for (const linkDataToCompare of linkDataList || []) {
      if (linkDataToCompare.aName === linkData.aName && linkData.context.toString() === linkDataToCompare.context.toString() && counter !== index ) {
        result.push(counter);
      }
      counter++;
    }

    return result;
  }
}

export = QW_ACT_R44;
