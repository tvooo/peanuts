import { Parser, Token, TokenType } from "../types";

export const apply =
  (p: Parser, fn: Function): Parser =>
  (tokens: Token[]) => {
    const result = p(tokens);
    return fn(result);
  };

export const validate =
  (p: Parser, fn: (r: any) => boolean): Parser =>
  (tokens: Token[]) => {
    const result = p(tokens);
    return fn(result) ? result : undefined;
  };

export const is =
  (type: TokenType): Parser =>
  (tokens) => {
    if (tokens[0] && tokens[0]!.type === type) {
      return tokens[0];
    }
    return false;
  };

export const str =
  (s: string): Parser =>
  (tokens) => {
    const word = is(TokenType.Word)(tokens);
    if (word && word.value === s) {
      return word;
    }
    return false;
  };

export const optional =
  (parser: Parser): Parser =>
  (tokens) =>
    parser(tokens) || "optional";

export const seq =
  (...parsers: Parser[]): Parser =>
  (_tokens) => {
    let success = true;
    let tokens = [..._tokens];
    let result: Token[] = [];

    for (
      let parserPos = 0, tokenPos = 0;
      parserPos < parsers.length;
      parserPos++
    ) {
      const token = tokens[tokenPos] as Token;
      if (!token) {
        return undefined;
      }
      const parser = parsers[parserPos] as Parser;
      const res = parser(tokens.slice(tokenPos));
      if (res) {
        if (res === "optional") {
          result.push({ value: "skip", type: TokenType.Skip });
          continue;
        }
        tokenPos++;
        result.push(res);
        continue;
      } else {
        success = false;
        break;
      }
    }
    if (success) {
      return result;
    }
    return undefined;
  };

export const until =
  (untilParser: Parser): Parser =>
  (_tokens) => {
    let tokens = [..._tokens];
    let result: Token[] = [];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i] as Token;
      if (!token) {
        return undefined;
      }
      if (untilParser(tokens.slice(i))) {
        return result;
      }
      result.push(token);
    }
    return result;
  };

export const or =
  (...fns: Parser[]): Parser =>
  (_tokens) => {
    for (let i = 0; i < fns.length; i++) {
      const parser = fns[i] as Parser;
      if (parser(_tokens)) {
        return parser(_tokens);
      }
    }
    return undefined;
  };
