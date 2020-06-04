import cacheStorage from './cache-storage';
import {delayTest, clearCache} from "./test-utils";

beforeEach(clearCache);

describe('Default storage options', () => {
    let writeStorage, readStorage;

    beforeEach(() => {
        writeStorage = cacheStorage('cache-one');
        readStorage = cacheStorage('cache-one');
    });

    it('should return undefined value if section is not stored in cache', () => {
        expect(readStorage.load('section3', {marker3: 1})).toEqual(undefined);
    });

    it('should store values between instances', () => {
        writeStorage.save('section1', {test: "data"}, {marker1: 1});
        expect(readStorage.load('section1', {marker1: 1})).toEqual({test: "data"});
    });

    it('should invalidate cache retrieval on changed cookie markers', () => {
        writeStorage.save('section1', {test:"data2"}, {marker2: 1});

        expect(readStorage.load('section1', {marker2:2})).toEqual(undefined);
    });

    it('should invalidate cache retrieval if markers count change', () => {
        writeStorage.save('section1', {test:"data2"}, {marker2: 1});

        expect(readStorage.load('section1', {marker2:1, marker1:1})).toEqual(undefined);
    })


    it('should scope all data with supplied prefixes', () => {
        const anotherStorage = cacheStorage('another-cache');

        anotherStorage.save('section2', {another:"Storage data"},{marker2: 100});

        expect(readStorage.load('section2', {marker2: 100})).toEqual(undefined);
    });

    it('should expire records in cache after specified lifetime', async () => {
        const expiredStorage = cacheStorage('cache-one', 0.004);

        expiredStorage.save(
            'section_that_expires',
            {value: 'that expires too'},
            {marker1: 0, marker2: 1}
        );

        await delayTest(5);

        expect(
            expiredStorage.load(
                'section_that_expires',
                {marker1: 0, marker2: 1}
            )
        ).toEqual(undefined)
    })

    it('should keep still valid records in cache one millisecond before expiration', async () => {
        const expiredStorage = cacheStorage('cache-one', 0.005);

        expiredStorage.save(
            'section_that_does_not_expire',
            {value: 'still valid value'},
            {marker1: 0, marker2: 1}
        );

        await delayTest(3);

        expect(
            expiredStorage.load(
                'section_that_does_not_expire',
                {marker1: 0, marker2: 1}
            )
        ).toEqual({value: 'still valid value'})
    });
});