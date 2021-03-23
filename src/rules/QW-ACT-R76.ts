import { ACTRuleResult } from '@qualweb/act-rules';
import { AccessibilityUtils, DomUtils } from '@qualweb/util';
import LanguageDetect from 'languagedetect';
import pixelWidth from 'string-pixel-width';
import Rule from '../lib/Rule.object';
import { ACTRuleDecorator } from '../lib/decorator';
import { QWElement } from '@qualweb/qw-element';
import { QWPage } from '@qualweb/qw-page';

const detector = new LanguageDetect();

@ACTRuleDecorator
class QW_ACT_R76 extends Rule {
  constructor(rule?: any) {
    super(rule);
  }

  execute(_element: QWElement | undefined, page: QWPage): void {
    const disabledWidgets = AccessibilityUtils.getDisabledWidgets(page);

    const elements = page.getElements('*');
    if (elements.length > 0) {
      for (const element of elements || []) {
        const tagName = element.getElementTagName();

        if (
          tagName === 'head' ||
          tagName === 'body' ||
          tagName === 'html' ||
          tagName === 'script' ||
          tagName === 'style' ||
          tagName === 'meta'
        )
          continue;

        const evaluation: ACTRuleResult = {
          verdict: '',
          description: '',
          resultCode: ''
        };

        const visible = DomUtils.isElementVisible(element, page);

        if (!visible) {
          evaluation.verdict = 'inapplicable';
          evaluation.description = 'Element is not visible.';
          evaluation.resultCode = 'RC1';
          super.addEvaluationResult(evaluation, element);
          continue;
        }

        const hasTextNode = element.hasTextNode();
        const elementText = DomUtils.getTrimmedText(element, page);

        if (!hasTextNode && elementText === '') {
          evaluation.verdict = 'inapplicable';
          evaluation.description = `Element doesn't have text.`;
          evaluation.resultCode = 'RC2';
          super.addEvaluationResult(evaluation, element);
          continue;
        }

        const isHTML = element.isElementHTMLElement();
        if (!isHTML) {
          evaluation.verdict = 'inapplicable';
          evaluation.description = 'Element is not an HTML element.';
          evaluation.resultCode = 'RC3';
          super.addEvaluationResult(evaluation, element);
          continue;
        }

        const isWidget = AccessibilityUtils.isElementWidget(element, page);
        if (isWidget) {
          evaluation.verdict = 'inapplicable';
          evaluation.description = 'Element has a semantic role that inherits from widget.';
          evaluation.resultCode = 'RC4';
          super.addEvaluationResult(evaluation, element);
          continue;
        }

        const elementSelectors = element.getElementSelector();

        let shouldContinue = false;

        for (const disableWidget of disabledWidgets || []) {
          const selectors = AccessibilityUtils.getAccessibleNameSelector(disableWidget, page);
          if (disableWidget && selectors && selectors.includes(elementSelectors)) {
            evaluation.verdict = 'inapplicable';
            evaluation.description = 'This text is part of a label of a disabled widget.';
            evaluation.resultCode = 'RC5';
            super.addEvaluationResult(evaluation, element);
            shouldContinue = true;
            break;
          }
        }

        if (shouldContinue) continue;

        const role = AccessibilityUtils.getElementRole(element, page);
        if (role === 'group') {
          const disable = element.getElementAttribute('disabled') !== null;
          const ariaDisable = element.getElementAttribute('aria-disabled') !== null;
          if (disable || ariaDisable) {
            evaluation.verdict = 'inapplicable';
            evaluation.description = 'Element has a semantic role of group and is disabled.';
            evaluation.resultCode = 'RC6';
            super.addEvaluationResult(evaluation, element);
            continue;
          }
        }

        const fgColor = element.getElementStyleProperty('color', null);
        let bgColor = this.getBackground(element);
        const opacity = parseFloat(element.getElementStyleProperty('opacity', null));
        const fontSize = element.getElementStyleProperty('font-size', null);
        const fontWeight = element.getElementStyleProperty('font-weight', null);
        const fontFamily = element.getElementStyleProperty('font-family', null);
        const fontStyle = element.getElementStyleProperty('font-style', null);
        const textShadow = element.getElementStyleProperty('text-shadow', null);

        if (textShadow.trim() !== 'none') {
          const properties = textShadow.trim().split(' ');
          if (properties.length === 6) {
            //const textShadowColor = properties[0] + ' ' + properties[1] + ' ' + properties[2];
            const vs = parseInt(properties[3], 0);
            const hs = parseInt(properties[4], 0);
            const blur = parseInt(properties[5], 0);
            const validateTextShadow = vs === 0 && hs === 0 && blur > 0 && blur <= 15;
            if (validateTextShadow) {
              evaluation.verdict = 'warning';
              evaluation.description = 'Element has text-shadow that needs manual verification.';
              evaluation.resultCode = 'RC14';
              super.addEvaluationResult(evaluation, element);
              continue;
            }
          }
        }

        if (this.isImage(bgColor)) {
          evaluation.verdict = 'warning';
          evaluation.description = 'Element has an image on background.';
          evaluation.resultCode = 'RC12';
          super.addEvaluationResult(evaluation, element);
          continue;
        }

        //TODO check char to char
        //TODO check if there is more colors
        //TODO account for margin and padding

        const regexGradient = /((\w-?)*gradient.*)/gm;
        let regexGradientMatches = bgColor.match(regexGradient);
        if (regexGradientMatches) {
          if (this.isHumanLanguage(elementText)) {
            let parsedGradientString = regexGradientMatches[0];
            this.evaluateGradient(
              evaluation,
              element,
              parsedGradientString,
              fgColor,
              opacity,
              fontSize,
              fontWeight,
              fontStyle,
              fontFamily,
              elementText
            );
          } else {
            evaluation.verdict = 'passed';
            evaluation.description = `Element doesn't have human language text.`;
            evaluation.resultCode = 'RC9';
            super.addEvaluationResult(evaluation, element);
          }
        } else {
          let parsedBG = this.parseRGBString(bgColor, opacity);
          let elementAux = element;
          let opacityAUX;
          shouldContinue = false;
          while (
            parsedBG === undefined ||
            (parsedBG.red === 0 && parsedBG.green === 0 && parsedBG.blue === 0 && parsedBG.alpha === 0)
          ) {
            let parent = elementAux.getElementParent();
            if (parent) {
              bgColor = this.getBackground(parent);
              if (this.isImage(bgColor)) {
                evaluation.verdict = 'warning';
                evaluation.description = 'Element has an image on background.';
                evaluation.resultCode = 'RC12';
                super.addEvaluationResult(evaluation, element);
                shouldContinue = true;
                break;
              } else {
                //helps visualize
                regexGradientMatches = bgColor.match(regexGradient);
                if (regexGradientMatches) {
                  let parsedGradientString = regexGradientMatches[0];
                  if (
                    this.evaluateGradient(
                      evaluation,
                      element,
                      parsedGradientString,
                      fgColor,
                      opacity,
                      fontSize,
                      fontWeight,
                      fontStyle,
                      fontFamily,
                      elementText
                    )
                  ) {
                    shouldContinue = true;
                    break;
                  }
                } else {
                  opacityAUX = parseFloat(parent.getElementStyleProperty('opacity', null));
                  parsedBG = this.parseRGBString(parent.getElementStyleProperty('background', null), opacityAUX);
                  elementAux = parent;
                }
              }
            } else {
              break;
            }
          }

          if (shouldContinue) {
            continue;
          }

          // if we cant find a bg color, we assume that is white (default bg page color)
          if (
            parsedBG === undefined ||
            (parsedBG.red === 0 && parsedBG.green === 0 && parsedBG.blue === 0 && parsedBG.alpha === 0)
          ) {
            parsedBG = { red: 255, green: 255, blue: 255, alpha: 1 };
          }

          const parsedFG = this.parseRGBString(fgColor, opacity);

          if (this.equals(parsedBG, parsedFG)) {
            evaluation.verdict = 'inapplicable';
            evaluation.description = 'Colors are equal.';
            evaluation.resultCode = 'RC7';
            super.addEvaluationResult(evaluation, element);
          } else {
            if (this.isHumanLanguage(elementText)) {
              const contrastRatio = this.getContrast(parsedBG, parsedFG);
              const isValid = this.hasValidContrastRatio(contrastRatio, fontSize, this.isBold(fontWeight));
              if (isValid) {
                evaluation.verdict = 'passed';
                evaluation.description = 'Element has contrast ratio higher than minimum.';
                evaluation.resultCode = 'RC9';
                super.addEvaluationResult(evaluation, element);
              } else {
                evaluation.verdict = 'failed';
                evaluation.description = 'Element has contrast ratio lower than minimum.';
                evaluation.resultCode = 'RC11';
                super.addEvaluationResult(evaluation, element);
              }
            } else {
              evaluation.verdict = 'passed';
              evaluation.description = `Element doesn't have human language text.`;
              evaluation.resultCode = 'RC9';
              super.addEvaluationResult(evaluation, element);
            }
          }
        }
      }
    }
  }

  getBackground(element: QWElement): string {
    const backgroundImage = element.getElementStyleProperty('background-image', null);
    if (backgroundImage === 'none') {
      let bg = element.getElementStyleProperty('background', null);
      if (bg === '') {
        bg = element.getElementStyleProperty('background-color', null);
      }

      return bg;
    } else {
      return backgroundImage;
    }
  }

  isImage(color: string): boolean {
    return (
      color.toLowerCase().includes('.jpeg') ||
      color.toLowerCase().includes('.jpg') ||
      color.toLowerCase().includes('.png') ||
      color.toLowerCase().includes('.svg')
    );
  }

  evaluateGradient(
    evaluation: ACTRuleResult,
    element: QWElement,
    parsedGradientString: any,
    fgColor: any,
    opacity: number,
    fontSize: string,
    fontWeight: string,
    fontStyle: string,
    fontFamily: string,
    elementText: string
  ): boolean {
    if (parsedGradientString.startsWith('linear-gradient')) {
      const gradientDirection = this.getGradientDirection(parsedGradientString);
      if (gradientDirection === 'to right') {
        const colors = this.parseGradientString(parsedGradientString, opacity);
        let isValid = true;
        let contrastRatio;
        const textSize = this.getTextSize(
          fontFamily.toLowerCase().replace(/['"]+/g, ''),
          parseInt(fontSize.replace('px', '')),
          this.isBold(fontWeight),
          fontStyle.toLowerCase().includes('italic'),
          elementText
        );
        if (textSize !== -1) {
          let elementWidth = element.getElementStyleProperty('width', null);
          let lastCharRatio = textSize / parseInt(elementWidth.replace('px', ''));
          let lastCharBgColor = this.getColorInGradient(colors[0], colors[colors.length - 1], lastCharRatio);
          contrastRatio = this.getContrast(colors[0], this.parseRGBString(fgColor, opacity));
          isValid = isValid && this.hasValidContrastRatio(contrastRatio, fontSize, this.isBold(fontWeight));
          contrastRatio = this.getContrast(lastCharBgColor, this.parseRGBString(fgColor, opacity));
          isValid = isValid && this.hasValidContrastRatio(contrastRatio, fontSize, this.isBold(fontWeight));
        } else {
          for (let color of colors) {
            contrastRatio = this.getContrast(color, this.parseRGBString(fgColor, opacity));
            isValid = isValid && this.hasValidContrastRatio(contrastRatio, fontSize, this.isBold(fontWeight));
          }
        }
        if (isValid) {
          evaluation.verdict = 'passed';
          evaluation.description = 'Element has gradient with contrast ratio higher than minimum.';
          evaluation.resultCode = 'RC8';
          super.addEvaluationResult(evaluation, element);
          return true;
        } else {
          evaluation.verdict = 'failed';
          evaluation.description = 'Element has gradient with contrast ratio lower than minimum.';
          evaluation.resultCode = 'RC10';
          super.addEvaluationResult(evaluation, element);
          return true;
        }
      } else if (gradientDirection === 'to left') {
        //TODO
        evaluation.verdict = 'warning';
        evaluation.description = "Element has an gradient that we can't verify.";
        evaluation.resultCode = 'RC13';
        super.addEvaluationResult(evaluation, element);
        return true;
      } else {
        evaluation.verdict = 'warning';
        evaluation.description = "Element has an gradient that we can't verify.";
        evaluation.resultCode = 'RC13';
        super.addEvaluationResult(evaluation, element);
        return true;
      }
    } else {
      evaluation.verdict = 'warning';
      evaluation.description = 'Element has an gradient that we cant verify.';
      evaluation.resultCode = 'RC13';
      super.addEvaluationResult(evaluation, element);
      return true;
    }

    return false;
  }

  isHumanLanguage(string: string): boolean {
    return detector.detect(string).length > 0;
  }

  equals(color1: any, color2: any): boolean {
    return (
      color1.red === color2.red &&
      color1.green === color2.green &&
      color1.blue === color2.blue &&
      color1.alpha === color2.alpha
    );
  }

  getGradientDirection(gradient: string): string | undefined {
    let direction = gradient.replace('linear-gradient(', '').split(',')[0];
    if (direction) {
      if (direction === '90deg') return 'to right';
      if (direction === '-90deg') return 'to left';

      return direction;
    }

    return undefined;
  }

  parseGradientString(gradient: string, opacity: number): any {
    const regex = /rgb(a?)\((\d+), (\d+), (\d+)+(, +(\d)+)?\)/gm;
    let colorsMatch = gradient.match(regex);
    let colors: any = [];
    for (let stringColor of colorsMatch || []) {
      colors.push(this.parseRGBString(stringColor, opacity));
    }

    return colors;
  }

  parseRGBString(colorString: string, opacity: number): any {
    let rgbRegex = /^rgb\((\d+), (\d+), (\d+)\)/;
    let rgbaRegex = /^rgba\((\d+), (\d+), (\d+), (\d*(\.\d+)?)\)/;

    // IE can pass transparent as value instead of rgba
    if (colorString === 'transparent') {
      return { red: 0, green: 0, blue: 0, alpha: 0 };
    }

    let match = colorString.match(rgbRegex);
    if (match) {
      return {
        red: parseInt(match[1], 10),
        green: parseInt(match[2], 10),
        blue: parseInt(match[3], 10),
        alpha: opacity
      };
    }

    match = colorString.match(rgbaRegex);
    if (match) {
      // if(match[1] === "0" && match[2] === "0" && match[3] === "0" && match[4] === "0")
      //   return{"red": 255, "green": 255, "blue": 255, "alpha": 1};
      // else
      return {
        red: parseInt(match[1], 10),
        green: parseInt(match[2], 10),
        blue: parseInt(match[3], 10),
        alpha: Math.round(parseFloat(match[4]) * 100) / 100
      };
    }
  }

  getRelativeLuminance(red: number, green: number, blue: number): number {
    let rSRGB = red / 255;
    let gSRGB = green / 255;
    let bSRGB = blue / 255;

    let r = rSRGB <= 0.03928 ? rSRGB / 12.92 : Math.pow((rSRGB + 0.055) / 1.055, 2.4);
    let g = gSRGB <= 0.03928 ? gSRGB / 12.92 : Math.pow((gSRGB + 0.055) / 1.055, 2.4);
    let b = bSRGB <= 0.03928 ? bSRGB / 12.92 : Math.pow((bSRGB + 0.055) / 1.055, 2.4);

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  flattenColors(fgColor: any, bgColor: any): any {
    let fgAlpha = fgColor['alpha'];
    let red = (1 - fgAlpha) * bgColor['red'] + fgAlpha * fgColor['red'];
    let green = (1 - fgAlpha) * bgColor['green'] + fgAlpha * fgColor['green'];
    let blue = (1 - fgAlpha) * bgColor['blue'] + fgAlpha * fgColor['blue'];
    let alpha = fgColor['alpha'] + bgColor['alpha'] * (1 - fgColor['alpha']);

    return { red: red, green: green, blue: blue, alpha: alpha };
  }

  private isBold(fontWeight: string): boolean {
    return !!fontWeight && ['bold', 'bolder', '700', '800', '900'].includes(fontWeight);
  }

  getContrast(bgColor: any, fgColor: any): number {
    if (fgColor.alpha < 1) {
      fgColor = this.flattenColors(fgColor, bgColor);
    }

    const bL = this.getRelativeLuminance(bgColor['red'], bgColor['green'], bgColor['blue']);
    const fL = this.getRelativeLuminance(fgColor['red'], fgColor['green'], fgColor['blue']);

    return (Math.max(fL, bL) + 0.05) / (Math.min(fL, bL) + 0.05);
  }

  hasValidContrastRatio(contrast: number, fontSize: string, isBold: boolean): boolean {
    /*const isSmallFont =
      (isBold && Math.ceil(parseInt(fontSize) * 96) / 72 < 14) ||
      (!isBold && Math.ceil(parseInt(fontSize) * 96) / 72 < 18);*/

    const isSmallFont = (isBold && parseFloat(fontSize) < 18.6667) || (!isBold && parseFloat(fontSize) < 24);
    const expectedContrastRatio = isSmallFont ? 7 : 4.5;

    return contrast > expectedContrastRatio;
  }

  getTextSize(font: string, fontSize: number, bold: boolean, italic: boolean, string: string): number {
    //firefox fix
    if (font === 'serif') font = 'times new roman';
    else if (font === 'sans-serif') font = 'arial';
    try {
      //@ts-ignore
      const width = pixelWidth(string, { font: font, size: fontSize, bold: bold, italic: italic });
      return width;
    } catch (error) {
      return -1;
    }
  }

  getColorInGradient(fromColor: any, toColor: any, ratio: number): any {
    let red = fromColor['red'] + (toColor['red'] - fromColor['red']) * ratio;
    let green = fromColor['green'] + (toColor['green'] - fromColor['green']) * ratio;
    let blue = fromColor['blue'] + (toColor['blue'] - fromColor['blue']) * ratio;

    return { red: red, green: green, blue: blue, alpha: 1 };
  }
}

export = QW_ACT_R76;