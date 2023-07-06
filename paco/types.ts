export enum TokenType {
    Number = 'Number',
    Weekday = 'Weekday',
    Month = 'Month',
    In = 'In',
    At = 'At',
    On = 'On',
    With = 'With',
    Next = 'Next',
    Previous = 'Previous',
    Punctuation = 'Punctuation',
    Whitespace = 'Whitespace',
    Word = 'Word',
    Am = 'AM',
    Pm = 'PM',
    Colon = 'Colon',
    Separator = 'Separator',
    RelativeDay = 'RelativeDay',
    DurationCategory = 'DurationCategory',
    Skip = 'Skip',
    Every = 'Every',
    NthSuffix = 'NthSuffix',
}

export type Token = {
    value: any
    type: TokenType
}

export type Tokenizer = (token: string) => Token | undefined

export type Parser = (tokens: Token[]) => any | undefined
