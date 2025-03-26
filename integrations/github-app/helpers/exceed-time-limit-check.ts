function hasExceededTwentyHours(start: Date, end: Date): boolean {
    const diff = end.getTime() - start.getTime();
    const hours = diff / 1000 / 60 / 60;
    return hours > 20;
}

// checks if the sync has exceeded the time limit of 20 hours
export function shouldAbortSync(startTime: Date): boolean {
    const endTime = new Date();
    return hasExceededTwentyHours(startTime, endTime);
}
