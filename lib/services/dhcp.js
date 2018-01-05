// DHCP listener
// This currently assumes a single DHCP server on the network
const _ = require('lodash');
const fbUtils = require('../utils/fb');

let session;

// Clients are referenced by MAC
let vendorMap;

const DHCPCodes = {
    DHCPDISCOVER: 1,
    DHCPOFFER:2,
    DHCPREQUEST: 3,
    DHCPDECLINE: 4,
    DHCPACK: 5,
    DHCPNAK: 6,
    DHCPRELEASE: 7,
    DHCPINFORM: 8
};

function decodeOptions(data, offset) {
    const options = [];
    let code = data.readUInt8(offset);
    let codeData;
    let index = offset;
    let type;

    while (code != 255) {
        let length = data.readUInt8(index + 1);
        codeData = null;
        switch (code) {
            case 50:
                codeData = `${data.readUInt8(index + 2)}.${data.readUInt8(index + 3)}.${data.readUInt8(index + 4)}.${data.readUInt8(index + 5)}`;
                break;

            case 51:
                codeData = data.readUInt32BE(index + 2);
                break;

            case 52:
                // Don't currently supported overloaded sname/file fields
                break;

            case 53:
                codeData = data.readUInt8(index + 2);
                type = _.find(DHCPCodes, (item) => item === codeData);
                break;

            case 54:
                codeData = `${data.readUInt8(index + 2)}.${data.readUInt8(index + 3)}.${data.readUInt8(index + 4)}.${data.readUInt8(index + 5)}`;
                break;

            case 58:
                codeData = data.readUInt32BE(index + 2);
                break;

            case 59:
                codeData = data.readUInt32BE(index + 2);
                break;
            }

        // Push option
        options.push({ code: code, data: codeData || null});

        index += length + 2;
        code = data.readUInt8(index);
    }

    return { type: type, options: options };
}

function toHexString(number, width) {
    let sNum = number.toString(16);
    sNum = sNum + '';
    return sNum.length >= width ? sNum : new Array(width - sNum.length + 1).join('0') + sNum;
}

// Return a dotted quad
function uintToIPAddr(uint) {
    return `${uint >> 24 & 0xff}.${uint >> 16 & 0xff}.${uint >> 8 & 0xff}.${uint & 0xff}`;
}

function decodeDHCP(data) {
    const buffer = data;

    const xid = buffer.readUInt32BE(4);
    const ciaddr = uintToIPAddr(buffer.readUInt32BE(12));
    const yiaddr = uintToIPAddr(buffer.readUInt32BE(16));
    const siaddr = uintToIPAddr(buffer.readUInt32BE(20));
    const giaddr = uintToIPAddr(buffer.readUInt32BE(24));
    const chaddr = [];

    for (octet = 0; octet < 52; octet++) {
        chaddr.push(buffer.readUInt32BE(28 + (octet * 4)));
    }

    const details = decodeOptions(data, 28 + 212);
    const options = details.options;
    const mac = `${toHexString(chaddr[0] >> 24 & 0xff, 2)}:${toHexString(chaddr[0] >> 16 & 0xff, 2)}:${toHexString(chaddr[0] >> 8 & 0xff, 2)}:` +
        `${toHexString(chaddr[0] & 0xff, 2)}:${toHexString(chaddr[1] >> 24 & 0xff, 2)}:${toHexString(chaddr[1] >> 16 & 0xff, 2)}`;

    return {
        eventType: 'DHCP',
        time: new Date(),
        renderConsole: renderConsole,
        type: details.type,
        yiaddr: yiaddr,
        giaddr: giaddr,
        mac: mac,
        siaddr: siaddr,
        options: options
    };
}

// Returns a string that details the event.
function formatEvent(event) {
    // We decode depending on the type of DHCP message
    let formatString = '';

    // Find the vendor for the mac, if possible. We're dumb atm, only support first three
    // octets.
    const time = event.time.toISOString();
    let vendor = vendorMap.get(event.mac.substring(0, 8));
    if (!vendor) {
        vendor = 'Unknown';
    }

    let typeString = _.findKey(DHCPCodes, (item) => item === event.type);
    switch (event.type) {
        case DHCPCodes.DHCPDISCOVER:
            formatString = `${time}\t${typeString}\t${event.mac}\t${vendor}`;
            break;

        case DHCPCodes.DHCPOFFER:
            formatString = `${time}\t${typeString}\t${event.mac}\t${vendor}\t${event.siaddr}\t${event.yiaddr}`;
            break;

        case DHCPCodes.DHCPREQUEST:
            // Need the request from the codes.
            const reqAddr = _.find(event.options, (option) => option.code === 50);
            formatString = `${time}\t${typeString}\t${event.mac}\t${vendor}\t${reqAddr.data}`;
            break;

        case DHCPCodes.DHCPDECLINE:
            formatString = `${time}\t${typeString}\t${event.mac}\t${vendor}`;
            break;

        case DHCPCodes.DHCPACK:
            formatString = `${time}\t${typeString}\t${event.mac}\t${vendor}\t${event.siaddr}\t${event.yiaddr}`;
            break;

        case DHCPCodes.DHCPNAK:
            formatString = `${time}\t${typeString}\t${event.mac}\t${vendor}`;
            break;

        case DHCPCodes.DHCPRELEASE:
            formatString = `${time}\t${typeString}\t${event.mac}\t${vendor}`;
            break;
    }

    return formatString;
}

function renderConsole(event) {
    if (event.eventType !== 'DHCP') {
        console.log('incorrect event type');
    }

    // Render it.
    console.log(formatEvent(event));
}

module.exports = {
    enable: (pcap, cb, vendors, primary, secondary) => {
        const dhcpPacket = (rawPacket, interface) => {
            var packet = pcap.decode.packet(rawPacket);
            var data = packet.payload.payload.payload;
            vendorMap = vendors;

            if (data) {
                cb(decodeDHCP(data.data));
            }
        };

        if (!primary) {
            console.log("Can't start without a primary interface");
            process.exit(1);
        }
        priSession = pcap.createSession(primary, 'udp portrange 67-68');
        priSession.on('packet', (packet) => { dhcpPacket(packet, primary); });
        console.log(`DHCP service listening on primary interface ${priSession.device_name}`);

        if (secondary) {
            secSession = pcap.createSession(secondary, 'udp portrange 67-68');
            secSession.on('packet', (packet) => { dhcpPacket(packet, secondary); });
            console.log(`DHCP service listening on secondary interface ${secSession.device_name}`);
        }
    },

    disable: (pcap) => {
        session.close();
    },

    // Take the global event list, filter it for protocol.
    // Also takes FB to display to
    renderStates(eventList) {
        const fbDetails = fbUtils.getFramebufferDetails();
        const fb = fbDetails.fb;
        let y = 10;

        // Filter only DHCP events.
        const dhcpEvents = _.filter(eventList, (event) => event.eventType === 'DHCP');
        const macEvents = _.uniqBy(dhcpEvents.reverse(), 'mac');

        // Render to the pitft
        fb.clear();
        fb.color(1, 1, 1);
        _.forEach(macEvents, (event) => {
            const textLine = formatEvent(event).replace(/\t/g, ' ');
            const lines = fbUtils.drawText(textLine, y);
            y += 10 * lines;
        });
    }
};