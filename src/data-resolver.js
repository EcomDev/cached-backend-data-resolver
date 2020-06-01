export default function (loader, readCookie) {
    const sections = {};

    return {
        add(section, placeholder, requiredCookies) {
            sections[section] = [placeholder, requiredCookies];
        },
        load(section) {
            const [placeholder, requiredCookies] = sections[section];

            const areRequiredCookiesSatisfied = requiredCookies.reduce(
                (result, cookie) => {
                    return result && readCookie(cookie) !== undefined;
                },
                true
            );

            if (areRequiredCookiesSatisfied) {
                loader([section]);
            }

            return Promise.resolve(placeholder);
        }
    }
}