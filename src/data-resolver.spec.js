import dataResolverFactory from './data-resolver';

beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
});

describe('Uncached behaviour', () => {
    let loader, loadedSections, dataResolver;

    beforeEach(() => {
        [loader, loadedSections] = fakeLoaderFactory({
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
        });

        dataResolver = dataResolverFactory(
            loader,
            fakeCookieRetriever({
                cart: 'cart123',
                wishlist: 'wishlist123'
            })
        );

        dataResolver.add('shopping-cart', {items: [], total: 0}, ['cart']);
        dataResolver.add('customer-account', {name: "Guest"}, ['customer']);
        dataResolver.add('wishlist', {likedItems: []}, ['wishlist']);
        dataResolver.add('compare-products', {product_ids: []}, ['compare']);
    });

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

    it.todo('should ignore loaders that do not have cookie marker');
    it.todo('should return data from loader for all requested placeholder sections');
})

describe('Cached behaviour', () => {
    it.todo('should return value from cache if all cookie markers are the same');
    it.todo('should return value from loader if at least one cookie marker is invalid');
    it.todo('should return value from placeholder if required cookie marker is missing');
})


function fakeLoaderFactory(data)
{
    const loadedSections = [];
    return [
        (sections) => Promise.resolve(sections.map(section=> {
            loadedSections.push(section);
            return data[section] !== undefined ? data[section] : 'NO DATA'
        })),
        () => loadedSections
    ];
}

function fakeCookieRetriever(cookies) {
    return (cookie) => cookies[cookie];
}