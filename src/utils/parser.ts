import { is, seq, str } from "@/paco/parsers";
import { type Parser, TokenType } from "@/paco/types";

const openStatement: Parser = seq(str("open"), is(TokenType.Whitespace), is(TokenType.Word));

export const parse = () => {
  const input = `2023-01-01 open dkb
2023-01-01 open asn

2023-01-01 open dkb

alias dkb "DKB"
alias asn "ASN Bank"


`;
};
