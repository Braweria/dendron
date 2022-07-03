import {
  TextNode,
  EditorConfig,
  LexicalNode,
  NodeKey,
  $isLineBreakNode,
  $isTextNode,
  $createTextNode,
} from "lexical";
import _ from "lodash";
import {
  TwoStateNode,
  TwoStateNodeMode,
  TwoStateNodeMode as TwoStateNodeState,
} from "./TwoStateNode";

//TODO: Support partial bolded line: *this part is bolded* but this is not
export class MatchTextTwoStateNode extends TwoStateNode {
  // public __regex: RegExp = /\*\*(.*?)\*\*/;
  // public tag = "**";

  private __formattedNumber: number = 0;

  public __regex: RegExp;
  public tag;

  private static convertRawTextToFormatted(
    rawText: string,
    tag: string
  ): string {
    return _.trim(rawText, tag);
  }

  constructor(
    rawText: string,
    regex: RegExp,
    tag: string,
    state: TwoStateNodeState,
    formatNumber: number,
    key?: NodeKey
  ) {
    super(
      MatchTextTwoStateNode.convertRawTextToFormatted(rawText, tag),
      rawText,
      state,
      key
    );

    this.tag = tag;
    this.__regex = regex;
    this.__formattedNumber = formatNumber;

    if (state === TwoStateNodeState.formatted) {
      this.__format = formatNumber;
    } else {
      this.__format = 0;
    }
  }

  static getType(): string {
    return "MatchTextTwoStateNode";
  }

  static clone(node: MatchTextTwoStateNode): MatchTextTwoStateNode {
    return new MatchTextTwoStateNode(
      node.__rawText,
      node.__regex,
      node.tag,
      node.__state,
      node.__formattedNumber,
      node.__key
    );
  }

  override setDisplayMode(mode: TwoStateNodeState) {
    const self = this.getLatest();
    self.__state = mode;

    if (mode === "raw") {
      self.setTextContent(self.getRawText());
      self.setFormat(0);
    } else {
      self.setTextContent(self.getFormattedText());
      self.setFormat(this.__formattedNumber);
    }
  }

  getCursorOffset(): number {
    return this.tag.length;
  }

  updateInternalTexts() {
    const self = this.getLatest();
    if (self.__state === TwoStateNodeState.raw) {
      self.__rawText = self.__text;
      self.__formattedText = _.trim(self.__text, this.tag);
    } else {
      self.__formattedText = self.__text;
      self.__rawText = `${this.tag}${self.__text}${this.tag}`;
    }
  }

  // createDOM(config: EditorConfig): HTMLElement {
  //   const element = super.createDOM(config);
  //   // element.style.color = this.__rawText;
  //   return element;
  // }

  // updateDOM(
  //   prevNode: FormattableNode,
  //   dom: HTMLElement,
  //   config: EditorConfig
  // ): boolean {
  //   const isUpdated = super.updateDOM(prevNode, dom, config);
  //   if (prevNode.__rawText !== this.__rawText) {
  //     dom.style.color = this.__rawText;
  //   }
  //   return isUpdated;
  // }
}

export function $createMatchTextTwoStateNode(
  rawText: string,
  regex: RegExp,
  tag: string,
  formatNumber: number
): MatchTextTwoStateNode {
  return new MatchTextTwoStateNode(
    rawText,
    regex,
    tag,
    TwoStateNodeState.formatted,
    formatNumber
  );
}

export enum onModificationResult {
  createdNodeBefore,
  createdNodeAfter,
  noop,
  revertToTextNode,
  updatedTexts,
}

export function $onModification(
  node: MatchTextTwoStateNode
): onModificationResult {
  // Don't do anything unless we're in raw mode - i.e. the user has the cursor inside the node
  if (node.getDisplayMode() === TwoStateNodeState.formatted) {
    return onModificationResult.noop;
  }

  const matches = node.__text.match(node.__regex);

  // First check if there's any regex match, if not, then convert back to text node and we're done.
  if (!matches || matches.length === 0) {
    console.log(`onModification - doing a replace back to textNode`);
    node.replace($createTextNode(node.getTextContent()));
    return onModificationResult.revertToTextNode;
  }

  console.log(
    `onModification - matches length: ${matches?.length} | matches index: ${matches.index} | node text: ${node.__text}, matches[0]: ${matches[0]}`
  );
  if (matches.index && matches.index > 0) {
    console.log(`onModification - Slicing Before`);
    const existing = node.__text;
    node.__text = node.__text.slice(matches.index);
    node.insertBefore($createTextNode(existing.slice(0, matches.index)));
    return onModificationResult.createdNodeBefore;
  }

  console.log(
    `derp ${matches.index} | ${matches[0].length} | ${node.__text.length} | ${node.__text}`
  );
  if (
    matches.index !== undefined &&
    matches.index + matches[0].length < node.__text.length
  ) {
    console.log(`onModification - Slicing After`);
    const existing = node.__text;
    node.__text = node.__text.slice(
      matches.index,
      matches.index + matches[0].length
    );

    const nextNodeLength = matches.index + matches[0].length;
    node.insertAfter($createTextNode(existing.slice(nextNodeLength)));
    return onModificationResult.createdNodeAfter;
  }

  // TODO: Do we need to maybe mark nodes as dirty in if statements above?
  node.updateInternalTexts();

  // console.log(`Performing selection. Length: ${node.__rawText.length}`);
  // Move the cursor
  // node.select(node.__rawText.length, node.__rawText.length);
  return onModificationResult.updatedTexts;
}

export function $isMatchTextTwoStateNode(
  node: LexicalNode | null | undefined
): node is MatchTextTwoStateNode {
  return node instanceof MatchTextTwoStateNode;
}

// export function $setDisplayMode(
//   node: MatchTextTwoStateNode,
//   mode: TwoStateNodeState
// ) {
//   if (node.getDisplayMode() !== mode) {
//     node.setDisplayMode(mode);
//   }
// }
