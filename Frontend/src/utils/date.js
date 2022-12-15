export const timestampToSinceNowDateTimeString = (timestamp, options = {}) => {
    const fullOptions = {
        showSeconds: ('showSeconds' in options) ? options.showSeconds : true,
        showMinutes: ('showMinutes' in options) ? options.showMinutes : true,
        showDays: ('showDays' in options) ? options.showDays : true,
        daysMax: ('daysMax' in options) ? options.daysMax : 30
    }
    const nowTimestamp = Math.floor(Date.now() / 1000);
    // console.log(`date::timestampToSince: Timestamp: ${timestamp}, Now: ${nowTimestamp}`)
    const totalSecondsAgo = nowTimestamp - timestamp
    const seconds = totalSecondsAgo % 60
    const minutes = Math.floor(totalSecondsAgo / 60) % 60
    const hours = Math.floor(totalSecondsAgo / 3600) % 24
    const days = Math.floor(totalSecondsAgo / 3600 / 24)
    const secondsString = (seconds !== 0) && fullOptions.showSeconds ? `${seconds} сек.` : ''
    const minutesString = (minutes !== 0) && fullOptions.showMinutes ? `${minutes} мин.` : ''
    const hoursString = (hours !== 0) && fullOptions.showHours ? `${hours} ч.` : ''
    var daysString = (days !== 0) && fullOptions.showDays ? `${days} дней` : ''
    if (fullOptions.showDays && days > fullOptions.daysMax) {
        return `более ${fullOptions.daysMax} дней назад`
    }
    return `${daysString} ${hoursString} ${minutesString} ${secondsString} назад`
}

export const timestampToSinceNowDateTimeStringApprox = (timestamp, options = {}) => {
    const fullOptions = {
        showSeconds: ('showSeconds' in options) ? options.showSeconds : true,
        showMinutes: ('showMinutes' in options) ? options.showMinutes : true,
        showHours: ('showHours' in options) ? options.showHours : true,
        showDays: ('showDays' in options) ? options.showDays : true,
        daysMax: ('daysMax' in options) ? options.daysMax : 30
    }
    const nowTimestamp = Math.floor(Date.now() / 1000);
    // console.log(`date::timestampToSince: Timestamp: ${timestamp}, Now: ${nowTimestamp}`)
    const totalSecondsAgo = nowTimestamp - timestamp
    const seconds = totalSecondsAgo % 60
    const minutes = Math.floor(totalSecondsAgo / 60) % 60
    const hours = Math.floor(totalSecondsAgo / 3600) % 24
    const days = Math.floor(totalSecondsAgo / 3600 / 24)
    const secondsString = (days === 0 && hours === 0 && minutes === 0) && fullOptions.showSeconds ? `${seconds} сек.` : ''
    const minutesString = (minutes !== 0 && days === 0 && hours === 0) && fullOptions.showMinutes ? `${minutes} мин.` : ''
    const hoursString = (hours !== 0 && days === 0) && fullOptions.showHours ? `${hours} ч.` : ''
    var daysString = (days !== 0) && fullOptions.showDays ? `${days} дней` : ''
    if (fullOptions.showDays && days > fullOptions.daysMax) {
        return `более ${fullOptions.daysMax} дней назад`
    }
    return `${daysString} ${hoursString} ${minutesString} ${secondsString} назад`
}

export const dateToYYYYMMDDString = (date) => {
    return `${date.getFullYear()}-${('0' + (date.getMonth() + 1)).slice(-2)}-${('0' + date.getDate()).slice(-2)}`
}

export const dateAddDays = (date, days) => {
    const res = new Date(date)
    res.setDate(res.getDate() + days)
    return res
}

export const makeTwoDigit = (num) => ('0' + num).slice(-2)

export const dateToDDMMYYYYHHMMSSString = (timestamp) => {
    const date = new Date(timestamp * 1000)
    return `${makeTwoDigit(date.getDate())}-${makeTwoDigit(date.getMonth() + 1)}-${date.getFullYear()} ${makeTwoDigit(date.getHours())}:${makeTwoDigit(date.getMinutes())}:${makeTwoDigit(date.getSeconds())}`
}

export const timestampToUnixTime = (timestamp) => {
    const date = new Date(timestamp * 1000)
    const dataOffsetHours = Math.abs(Math.floor(date.getTimezoneOffset() / 60))
    const dataOffsetMin = Math.abs(date.getTimezoneOffset() % 60)
    const sign = dataOffsetHours > 0 ? '+' : '-'
    var dataOffsetString = `${sign}${makeTwoDigit(dataOffsetHours)}${makeTwoDigit(dataOffsetMin)}`
    if (date.getTimezoneOffset() === 0)
     dataOffsetString = 'Z'

    return `${date.getFullYear()}-${makeTwoDigit(date.getMonth() + 1)}-${makeTwoDigit(date.getDate())}T${makeTwoDigit(date.getHours())}:${makeTwoDigit(date.getMinutes())}:${makeTwoDigit(date.getSeconds())}${dataOffsetString}`
}