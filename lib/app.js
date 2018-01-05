const pcap = require('pcap');

// Framebuffer

// Scan through all services and register them
// TBD, just needs a file scanner and importing each available

// Enabling a service starts packet capture
// Disabling a service stops packet capture

// The app is called with events, which are pushed into a timeline
// the timeline grows and needs eventual purging or dumping to a timeseries
// DB

const dhcp = require('./services/dhcp');
const macUtils = require('./utils/mac-vendors');

// This is most useful when the device running this is setup between the main gateway
// and the rest of the network.
// eg:
//  device 1  \
//  device 2  -- <intf1> capturing device <intf2> - main gateway (serving DHCP etc.)
//  device 3  /
//
// Doing this means *all* traffic is routed through the capture device, which allows
// it to see everything.
// However, this does require forwarding rules to ensure that traffic is passed between
// intf1 and intf2, which needs to be added next via iptables.

const PRI_INTF = process.env.PRI_INTF;
const SEC_INTF = process.env.SEC_INFT;
const eventList = [];

function onEvent(event) {
    eventList.push(event);

    // Render all DHCP events.
    // This filters via mac currently to show each state for each
    // independant device in real time.
    dhcp.renderStates(eventList);
}

// Read the OUI
macUtils.readOUI().then((vendorMap) => {
    // Enable DHCP
    dhcp.enable(pcap, onEvent, vendorMap, PRI_INTF, SEC_INTF);
});
