import { durationCategories, months, weekdays } from './data'
import { Token, TokenType, Tokenizer } from './types'

const isWordChar = (s: string) => /[a-zA-Z]/.test(s)
const isNumChar = (s: string) => /\d/.test(s)
const isSpcChar = (s: string) => /\s/.test(s)

const getTokenMode = (s: string) => {
    if (isWordChar(s)) {
        return 'word'
    }
    if (isNumChar(s)) {
        return 'number'
    }
    if (isSpcChar(s)) {
        return 'whitespace'
    }
    return 'punctuation'
}

const word = (token: string): Token => ({
    value: token,
    type: TokenType.Word,
})

const str =
    (toMatch: string, type: TokenType): Tokenizer =>
    (token: string) => {
        if (toMatch.toLowerCase() === token.toLowerCase()) {
            return {
                value: token,
                type: type,
            }
        }
    }

const whitespace: Tokenizer = (token: string) => {
    if (/\s+/.test(token)) {
        return {
            value: token,
            type: TokenType.Whitespace,
        }
    }
}

const punctuation: Tokenizer = (token: string) => {
    if (/[,.;:()[\]{}]/.test(token)) {
        return {
            value: token,
            type: TokenType.Punctuation,
        }
    }
}

const number: Tokenizer = (token: string) => {
    if (/\d+/.test(token)) {
        return {
            value: token,
            type: TokenType.Number,
        }
    }
}

const oneOf =
    (options: string[], type: TokenType): Tokenizer =>
    (token: string) => {
        if (options.includes(token)) {
            return {
                value: token,
                type,
            }
        }
    }

const WITH = oneOf(['with', 'w/', 'w'], TokenType.With)
const AT = str('at', TokenType.At)
const ON = str('on', TokenType.On)
const NEXT = str('next', TokenType.Next)
const PREVIOUS = oneOf(['prev', 'previous'], TokenType.Previous)
const AM = str('am', TokenType.Am)
const PM = str('pm', TokenType.Pm)
const WEEKDAY = oneOf(weekdays, TokenType.Weekday)
const MONTH = oneOf(months, TokenType.Month)
const COLON = str(':', TokenType.Colon)
const DASH = str('-', TokenType.Separator)
const SLASH = str('/', TokenType.Separator)
const RELATIVEDAY = oneOf(['yesterday', 'today', 'tod', 'tomorrow', 'tom'], TokenType.RelativeDay)
const DURATIONCATEGORY = oneOf(durationCategories, TokenType.DurationCategory)
const EVERY = oneOf(['every', 'ev'], TokenType.Every)
const NTHSUFFIX = oneOf(['st', 'nd', 'rd', 'th'], TokenType.NthSuffix)

export function tokenize(text: string): Token[] {
    let tokens: Token[] = []
    let pos = 0

    function consume() {
        if (!text[pos]) {
            return
        }
        let token = ''
        let tokenMode = getTokenMode(text[pos] as string)

        // Add characters to token
        while (text[pos] && tokenMode === getTokenMode(text[pos] as string)) {
            token = `${token}${text[pos]}`
            pos++
        }
        tokens.push(
            WITH(token) ||
                AT(token) ||
                ON(token) ||
                NEXT(token) ||
                PREVIOUS(token) ||
                AM(token) ||
                PM(token) ||
                WEEKDAY(token) ||
                MONTH(token) ||
                COLON(token) ||
                DASH(token) ||
                SLASH(token) ||
                RELATIVEDAY(token) ||
                DURATIONCATEGORY(token) ||
                EVERY(token) ||
                NTHSUFFIX(token) ||
                punctuation(token) ||
                number(token) ||
                whitespace(token) ||
                word(token),
        )
    }

    do {
        consume()
    } while (pos < text.length)

    return tokens
}
