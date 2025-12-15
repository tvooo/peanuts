import {
  addYears,
  isFuture,
  nextDay,
  parseISO,
  previousDay,
  set,
  startOfDay,
  startOfToday,
  startOfTomorrow,
  startOfYesterday,
} from "date-fns";

import { months, weekdays } from "../data";
import { type Parser, type Token, TokenType } from "../types";

import { apply, is, optional, or, seq } from "./base";

const separator = is(TokenType.Separator);

const relativeDate: Parser = apply(
  seq(
    or(is(TokenType.Next), is(TokenType.Previous)),
    is(TokenType.Whitespace),
    is(TokenType.Weekday)
  ),
  (result: [Token, Token, Token]) => {
    if (!result) {
      return;
    }
    const [nextPrev, , weekday] = result;
    const day = (weekdays.indexOf(weekday.value) % 7) as Day;
    return startOfDay(
      nextPrev.type === TokenType.Next ? nextDay(new Date(), day) : previousDay(new Date(), day)
    );
  }
);

const shortRelativeDate: Parser = apply(is(TokenType.Weekday), (weekday: Token) => {
  if (!weekday) {
    return;
  }
  const day = (weekdays.indexOf(weekday.value) % 7) as Day;
  return startOfDay(nextDay(new Date(), day));
});

const relativeDay: Parser = apply(is(TokenType.RelativeDay), (result: Token) => {
  if (!result) {
    return;
  }
  const value = result.value.toLowerCase();
  if (["today", "tod"].includes(value)) {
    return startOfToday();
  }
  if (value === "yesterday") {
    return startOfYesterday();
  }
  if (["tomorrow", "tom"].includes(value)) {
    return startOfTomorrow();
  }
  return;
});

const formattedDate = apply(
  seq(is(TokenType.Number), separator, is(TokenType.Number), separator, is(TokenType.Number)),
  (result: [Token, Token, Token, Token, Token]) => {
    if (!result) {
      return;
    }
    const [a, , , , c] = result;
    if (a.value.length === 4) {
      // ISO
      const dt = parseISO(result.map((t) => t.value).join(""));
      if (dt instanceof Date) {
        return dt;
      }
    }
    if (c.value.length === 4) {
      // FIXME: implement
      // EU, US
      return;
    }
  }
);

const shortDate = apply(
  seq(
    is(TokenType.Number),
    optional(is(TokenType.NthSuffix)),
    optional(is(TokenType.Whitespace)),
    is(TokenType.Month)
  ),
  (result: [Token, Token, Token, Token]) => {
    if (!result) {
      return;
    }
    const [day, , , monthToken] = result;
    const month = months.indexOf(monthToken.value) % 12;
    const date = startOfDay(
      set(new Date(), {
        date: day.value as number,
        month,
      })
    );
    return isFuture(date) ? date : addYears(date, 1);
  }
);

const longDate = apply(
  seq(
    is(TokenType.Number),
    optional(is(TokenType.NthSuffix)),
    optional(is(TokenType.Whitespace)),
    is(TokenType.Month),
    is(TokenType.Whitespace),
    is(TokenType.Number)
  ),
  (result: [Token, Token, Token, Token, Token, Token]) => {
    if (!result) {
      return;
    }
    const [day, , , monthToken, , year] = result;
    const month = months.indexOf(monthToken.value) % 12;
    const date = startOfDay(
      set(new Date(), {
        date: day.value as number,
        month,
        year: year.value as number,
      })
    );
    return date;
  }
);

export const date = or(
  longDate,
  shortDate,
  relativeDate,
  shortRelativeDate,
  formattedDate,
  relativeDay
);
