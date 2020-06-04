import cacheStorage from './cache-storage';

const sections = {};
const dataToLoad = [];
const timers = [];

function executeLoader(loader) {
    timers.splice(0, timers.length).map(
        timerId => clearTimeout(timerId)
    );

    const callbacks = dataToLoad
        .splice(0, dataToLoad.length);

    loader(callbacks.map(([section]) => section))
        .then((data) => {
            callbacks.forEach(([section, resolve]) => resolve(data[section]))
        })
}

function readCookies(cookieNames, readCookie) {
    return cookieNames.reduce(
        (result, cookie) => {
            const cookieValue = readCookie(cookie);
            if (cookieValue !== undefined) {
                result[cookie] = cookieValue;
            }
            return result;
        },
        {}
    );
}

function isRequiredCookieSet(requiredCookies, cookies) {
    return requiredCookies.reduce(
        (result, cookie) => {
            return result && cookies[cookie] !== undefined;
        },
        true
    );
}

export default function (loader, readCookie, cachePrefix, ttl) {
    cachePrefix = cachePrefix || 'data-resolver';
    ttl = ttl || 360;

    const storage = cacheStorage(cachePrefix, ttl);

    const scheduleLoad = (section, resolve) => {
       dataToLoad.push([section, resolve]);
       timers.push(
           setTimeout(() => executeLoader(loader), 5)
       );
    }

    return {
        add(section, placeholder, requiredCookies, optionalCookies) {
            optionalCookies = optionalCookies || [];
            sections[section] = [placeholder, requiredCookies, optionalCookies];
        },
        load(section) {
            const [placeholder, requiredCookies, optionalCookies] = sections[section];

            const cookieValues = readCookies([...requiredCookies, ...optionalCookies], readCookie);

            if (isRequiredCookieSet(requiredCookies, cookieValues)) {
                const cachedValue = storage.load(section, cookieValues);
                if (cachedValue !== undefined) {
                    return Promise.resolve(cachedValue);
                }

                return new Promise((resolve) => {
                    scheduleLoad(section, value => {
                        storage.save(section, value, cookieValues)
                        resolve(value);
                    });
                })
            }

            return Promise.resolve(placeholder);
        }
    }
}