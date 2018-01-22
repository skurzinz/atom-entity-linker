'use babel';
import entityAcProvider from './entity-ac-provider';

export default {
    getProvider() {
        // return a single provider, or an array of providers to use together
        return [entityAcProvider];
    }
};
