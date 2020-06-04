
function metadataKey(section) {
    return section + '-meta';
}

function storageFactory(prefix) {
    const browserStorage = window.localStorage || window.sessionStorage;

    return {
        setItem(key, value) {
            return browserStorage.setItem(prefix + key, value);
        },
        getItem(key) {
            const value = browserStorage.getItem(prefix + key);
            return value ? value : undefined;
        }
    }
}

function areMarkersSame(left, right) {
    let leftProperties = Object.getOwnPropertyNames(left);
    let rightProperties = Object.getOwnPropertyNames(right);

    if (leftProperties.length !== rightProperties.length) {
        return false;
    }

    for (let key of leftProperties) {
        if (right[key] !== left[key]) {
            return false;
        }
    }

    return true;
}

export default function (prefix, ttl) {
    const browserStorage = storageFactory(prefix);
    ttl = ttl || 360;

    return {
        save(section, data, markers) {
            browserStorage.setItem(section, JSON.stringify(data));
            browserStorage.setItem(
                metadataKey(section),
                JSON.stringify({
                    markers: markers,
                    expireTime: (new Date()).getTime() + ttl*1000
                })
            );
        },
        load(section, markers) {
            const metadataString = browserStorage.getItem(metadataKey(section));

            if (!metadataString) {
                return undefined;
            }

            const storedMetadata = JSON.parse(metadataString);

            if (!storedMetadata) {
                return undefined;
            }

            if (!areMarkersSame(storedMetadata.markers, markers)) {
                return undefined;
            }

            let currentTime = (new Date()).getTime();

            if (storedMetadata.expireTime < currentTime) {
                return undefined;
            }


            const data = browserStorage.getItem(section);

            if (!data) {
                return undefined;
            }

            return JSON.parse(data);
        }
    };
}

