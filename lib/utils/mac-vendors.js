// Determines a vendor based on a MAC address
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const _ = require('lodash');

module.exports = {
    readOUI: () => {
        const macVendors = new Map();

        return fs.readFileAsync(`${__dirname}/../../oui-mac.txt`, { encoding: 'utf8' }).then(data => {
            const lines = data.split('\n');
            const macRE = /^([0-9A-Z]{2}:[0-9A-Z]{2}:[0-9A-Z]{2})\s(.*?)\s/;

            _.forEach(lines, (line) => {
                // Does it match? If so add to the returned list
                const matches = line.match(macRE);
                if (matches) {
                    macVendors.set(matches[1].toLowerCase(), matches[2]);
                }
            });
        }).catch(err => {
            // No data or unable to read, we just don't have a LUT.
            console.log(err);
        }).return(macVendors);
    }
};