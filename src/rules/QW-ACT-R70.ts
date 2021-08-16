import { ACTRule } from '@qualweb/act-rules';
import { Translate } from '@qualweb/locale';
import AtomicRule from '../lib/AtomicRule.object';
import { ACTRuleDecorator, ElementExists, ElementHasNegativeTabIndex } from '../lib/decorator';
import Test from '../lib/Test.object';

@ACTRuleDecorator
class QW_ACT_R70 extends AtomicRule {
  constructor(rule: ACTRule, locale: Translate) {
    super(rule, locale);
  }

  @ElementExists
  @ElementHasNegativeTabIndex
  execute(element: typeof window.qwElement): void {
    const test = new Test();

    if (!element.isVisible()) {
      test.verdict = 'passed';
      test.resultCode = 'RC1';
      test.addElement(element);
    } else {
      const elementList = window.qwPage.findAll('*', undefined);
      const inSequentialFocusList = elementList.filter((elem) => {
        return elem.isPartOfSequentialFocusNavigation() && elem.isVisible();
      });

      if (inSequentialFocusList.length === 0) {
        test.verdict = 'passed';
        test.resultCode = 'P1';
        test.addElement(element);
      } else {
        test.verdict = 'failed';
        test.resultCode = 'F1';
        test.addElement(element, false);
      }
    }

    super.addTestResult(test);
  }
}

export = QW_ACT_R70;
