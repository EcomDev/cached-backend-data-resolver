export function delayTest(delayInMilliseconds) {
    return new Promise((resolve) => {
        setTimeout(resolve, delayInMilliseconds);
    });
}

export function clearCache() {
    window.localStorage.clear();
    window.sessionStorage.clear();
}
