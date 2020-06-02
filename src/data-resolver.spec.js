import dataResolverFactory from './data-resolver';

beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
});

function setupEcommerceDataResolver(cookieValues, sectionBackendResponses) {
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
        fakeCookieRetriever(cookieValues)
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
})

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
        }
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
    it.todo('should return value from loader if at least one cookie marker is invalid');
    it.todo('should return value from placeholder if required cookie marker is missing');
})


function fakeLoaderFactory(data)
{
    const loadedSections = [];
    return [
        (sections) => {
            loadedSections.splice(0, loadedSections.length);
            return Promise.resolve(
                sections.reduce((result, section) => {
                    loadedSections.push(section);
                    result[section] = data[section] !== undefined ? data[section] : 'NO DATA';
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