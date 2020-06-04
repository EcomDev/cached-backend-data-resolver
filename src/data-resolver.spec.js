import dataResolverFactory from './data-resolver';
import {clearCache, delayTest} from './test-utils';

beforeEach(clearCache);

function setupEcommerceDataResolver(cookieValues, sectionBackendResponses, ttl) {
    cookieValues = cookieValues || {
        cart: 'cart123',
        wishlist: 'wishlist123'
    };
    sectionBackendResponses = sectionBackendResponses || {
        "shopping-cart": {
            items: [
                "Item 1",
                "Item 2"
            ],
            total: 100
        },
        "customer-account": {
            name: "Anonymous"
        },
        "wishlist": {
            likedItems: ["Nothing I like"]
        }
    };
    const [loader, loadedSections] = fakeLoaderFactory(sectionBackendResponses);

    const dataResolver = dataResolverFactory(
        loader,
        typeof cookieValues === 'function' ? cookieValues : fakeCookieRetriever(cookieValues),
        undefined,
        ttl
    );

    dataResolver.add('shopping-cart', {items: [], total: 0}, ['cart']);
    dataResolver.add('customer-account', {name: "Guest"}, ['customer']);
    dataResolver.add('wishlist', {likedItems: []}, ['wishlist']);
    dataResolver.add('compare-products', {product_ids: []}, ['compare']);

    return [loadedSections, dataResolver];
}


describe('Uncached behaviour', () => {
    let loadedSections, dataResolver;

    beforeEach(() => [loadedSections, dataResolver] = setupEcommerceDataResolver());

    it('should return customer placeholder value when no cookie marker present', async () => {
        expect(await dataResolver.load('customer-account')).toEqual({name: "Guest"});
    });

    it('should return compare placeholder value when no cookie marker present', async () => {
        expect(await dataResolver.load('compare-products')).toEqual( {product_ids: []});
    });

    it('should execute shopping cart loader when cookie marker is present', async () => {
        await dataResolver.load('shopping-cart');

        expect(loadedSections()).toEqual(['shopping-cart']);
    });

    it('should not execute customer loader when other cookie markers are present', async () => {
        await dataResolver.load('customer-account');

        expect(loadedSections()).toEqual([]);
    });

    it('should ignore loaders that do not have cookie marker', async() => {
        await Promise.all([
            dataResolver.load('customer-account'),
            dataResolver.load('shopping-cart'),
            dataResolver.load('wishlist'),
            dataResolver.load('compare-products')
        ]);

        expect(loadedSections()).toEqual(['shopping-cart', 'wishlist']);
    });

    it('should return data from loader for all requested placeholder sections', async () => {
        expect(await Promise.all([
            dataResolver.load('customer-account'),
            dataResolver.load('shopping-cart'),
            dataResolver.load('wishlist'),
            dataResolver.load('compare-products')
        ])).toEqual([
            {name: "Guest"},
            {items: ["Item 1", "Item 2"], total: 100},
            {likedItems: ["Nothing I like"]},
            {product_ids: []}
        ]);
    });
});

describe('Cached behaviour', () => {
    let loadedSections, dataResolver;


    beforeEach(() => [loadedSections, dataResolver] = setupEcommerceDataResolver(
        {
            cart: 123,
            wishlist: 567
        },
        {
           "shopping-cart": {items: ['Cached Item']},
           "wishlist": {likedItems: ['Cached Item']}
        },
        0.005
    ));

    it('should return value from cache if all cookie markers are the same', async () => {
        await Promise.all([
            dataResolver.load('shopping-cart'),
            dataResolver.load('wishlist')
        ]);

        [, dataResolver] = setupEcommerceDataResolver(
            {
                cart: 123,
                wishlist: 567
            },
            {
                "shopping-cart": {items: ['Non cached item']},
                "wishlist": {likedItems: ['Non cached item']}
            }
        )

        expect(await Promise.all([
            dataResolver.load('shopping-cart'),
            dataResolver.load('wishlist')
        ])).toEqual(
            [
                {items: ['Cached Item']},
                {likedItems: ['Cached Item']}
            ]
        )
    })
    it('should return value from loader if at least one cookie marker is invalid', async () => {
        await Promise.all([
            dataResolver.load('shopping-cart'),
            dataResolver.load('wishlist')
        ]);

        [, dataResolver] = setupEcommerceDataResolver(
            {
                cart: 111,
                wishlist: 222
            },
            {
                "shopping-cart": {items: ['Non cached item']},
                "wishlist": {likedItems: ['Non cached item']}
            }
        )

        expect(await Promise.all([
            dataResolver.load('shopping-cart'),
            dataResolver.load('wishlist')
        ])).toEqual(
            [
                {items: ['Non cached item']},
                {likedItems: ['Non cached item']}
            ]
        )
    })
    it('should return value from placeholder if required cookie marker is missing', async () => {
        await Promise.all([
            dataResolver.load('shopping-cart'),
            dataResolver.load('wishlist')
        ]);

        [, dataResolver] = setupEcommerceDataResolver(
            {},
            {
                "shopping-cart": {items: ['This should never be shown']},
                "wishlist": {likedItems: ['This should never be shown']}
            }
        )

        expect(await Promise.all([
            dataResolver.load('wishlist'),
            dataResolver.load('shopping-cart')
        ])).toEqual([
            {likedItems: []},
            {items: [], total: 0}
        ]);
    });
    it('should load data from server if cache lifetime is past required time', async () => {
        await dataResolver.load('shopping-cart');

        [, dataResolver] = setupEcommerceDataResolver(
            {
                cart: 123
            },
            {
                "shopping-cart": {items: ['Non cached item']}
            },
            0.005
        )

        await delayTest(6);

        expect(await dataResolver.load('shopping-cart')).toEqual({items: ['Non cached item']});
    });
})

describe("Cached data with optional cookie markers", () => {
    let dataResolver, cookies, backendData;

    beforeEach(() => {
        cookies = {};
        backendData = {
            'customer-achievements': [
                'Cached Achievement 1',
                'Cached Achievement 2'
            ],
            'customer-failures': [
                'Cached Fail 1',
                'Cached Fail 2'
            ]
        };

        const [loader] = fakeLoaderFactory(section => backendData[section]);
        dataResolver = dataResolverFactory(
            loader,
            cookieName => cookies[cookieName]
        );

        dataResolver.add(
            'customer-achievements',
            ['No Achievements'],
            ['achievements', 'customer'],
            ['country', 'season']
        );

        dataResolver.add(
            'customer-failures',
            ['No Fails'],
            ['failures', 'customer'],
            ['country', 'year']
        );
    })

    it('should return non cached value if optional marker appeared in cookies', async () => {
        cookies = {
            achievements: 12,
            customer: 777
        };

        await dataResolver.load('customer-achievements');

        cookies['country'] = 'US';

        backendData['customer-achievements'] = ['Changed Achievement 1'];

        expect(await dataResolver.load('customer-achievements')).toEqual(['Changed Achievement 1']);
    });

    it('should return cached value if optional marker stays the same', async () => {
        cookies = {
            failures: 12,
            customer: 777,
            country: 'NL'
        };

        await dataResolver.load('customer-failures');

        backendData['customer-failures'] = ['Should not fail here!'];

        cookies['season'] = 'fall';

        expect(await dataResolver.load('customer-failures')).toEqual(['Cached Fail 1', 'Cached Fail 2']);
    });
});

function fakeLoaderFactory(data)
{
    const loadedSections = [];
    const dataRetriever =
        typeof data === 'function' ?
            data :
            section => data[section] === undefined ? 'NO DATA' : data[section];

    return [
        (sections) => {
            loadedSections.splice(0, loadedSections.length);
            return Promise.resolve(
                sections.reduce((result, section) => {
                    loadedSections.push(section);
                    result[section] = dataRetriever(section);
                    return result;
                },
                {}
            ))
        },
        () => loadedSections
    ];
}

function fakeCookieRetriever(cookies) {
    return (cookie) => cookies[cookie];
}