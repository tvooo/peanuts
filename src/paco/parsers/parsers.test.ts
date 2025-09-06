import { isSameDay, isToday, isTomorrow, isYesterday, nextTuesday, previousTuesday } from 'date-fns'
import { describe, expect, it } from 'vitest'

import { tokenize as t } from '../tokenize'

import { date } from './date'
import { duration } from './duration'
import { time } from './time'

describe('time', () => {
    it('12-hour time', () => {
        expect(time(t('4am'))).toEqual({ hours: 4, minutes: 0 })
        expect(time(t('4 pm'))).toEqual({ hours: 16, minutes: 0 })
        expect(time(t('12pm'))).toEqual({ hours: 12, minutes: 0 })
        expect(time(t('12am'))).toEqual({ hours: 0, minutes: 0 })

        expect(time(t('13am'))).toEqual(undefined)
    })

    it('24-hour time', () => {
        expect(time(t('16:00'))).toEqual({ hours: 16, minutes: 0 })
        expect(time(t('4:00'))).toEqual({ hours: 4, minutes: 0 })
        expect(time(t('04:00'))).toEqual({ hours: 4, minutes: 0 })
        expect(time(t('7:45'))).toEqual({ hours: 7, minutes: 45 })

        expect(time(t('12:73'))).toEqual(undefined)
        expect(time(t('24:01'))).toEqual(undefined)
    })
})

describe('date', () => {
    const today = new Date()

    it('complete date', () => {
        expect(isSameDay(date(t('3 sep 2020')), new Date(2020, 8, 3))).toBe(true)
        expect(isSameDay(date(t('1 jan 2025')), new Date(2025, 0, 1))).toBe(true)

        expect(isSameDay(date(t('3rd sep 2020')), new Date(2020, 8, 3))).toBe(true)
        expect(isSameDay(date(t('1st jan 2025')), new Date(2025, 0, 1))).toBe(true)

        expect(isSameDay(date(t('2020-09-03')), new Date(2020, 8, 3))).toBe(true)
        expect(isSameDay(date(t('2025-01-01')), new Date(2025, 0, 1))).toBe(true)

        // FIXME: Write validators for date components first, then uncomment this
        // expect(date(t('2025-14-01'))).toEqual(undefined)
        // expect(date(t('2025-08-40'))).toEqual(undefined)
    })

    it('incomplete date', () => {
        expect(isSameDay(date(t('3 sep')), new Date(2023, 8, 3))).toBe(true)
        expect(isSameDay(date(t('1 jan')), new Date(2024, 0, 1))).toBe(true)

        expect(isSameDay(date(t('3rd sep')), new Date(2023, 8, 3))).toBe(true)
        expect(isSameDay(date(t('1st jan')), new Date(2024, 0, 1))).toBe(true)
    })

    it('relative date', () => {
        expect(isToday(date(t('today')))).toBe(true)
        expect(isToday(date(t('tod')))).toBe(true)
        expect(isYesterday(date(t('yesterday')))).toBe(true)
        expect(isTomorrow(date(t('tomorrow')))).toBe(true)
        expect(isTomorrow(date(t('tom')))).toBe(true)

        // FIXME: implement
        expect(isSameDay(date(t('tue')), nextTuesday(today))).toBe(true)
        expect(isSameDay(date(t('next tuesday')), nextTuesday(today))).toBe(true)
        expect(isSameDay(date(t('previous tuesday')), previousTuesday(today))).toBe(true)

        // FIXME: implement
        // expect(isSameDay(date(t('in 3 days')), nextTuesday(today))).toBe(true)
        // expect(isSameDay(date(t('in two hours')), previousTuesday(today))).toBe(true)
    })
})

describe('duration', () => {
    it('complete date', () => {
        expect(duration(t('3 mins'))).toEqual({ category: 'minutes', minutes: 3, value: 3 })
        expect(duration(t('10 hours'))).toEqual({ category: 'hours', minutes: 600, value: 10 })

        // FIXME: implement
        // expect(duration(t('two days'))).toEqual({ category: 'days', minutes: 2 * 24 * 60, value: 2 })
    })
})
