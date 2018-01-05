# pocket-netmon

Currently rough and ready packet analyser for Pi, which displays to the PiTFT.

DHCP only atm, and PoC.

Build, deploy and run on a Pi3 (or Pi/Pi2, but change the Dockerfile) running a PiTFT to see the last DHCP status for other nodes on the same network.

TBD: Secondary interface passthrough for all network traffic and other packet protocols.

It's rough, and ultimately needs to be TypeScripted.

## FAQ

* Why bother, why not run Wireshark?

I'd like a pocket analyser I can 'just plug in' to a network and see the last states of particular protocols on particular nodes. Eventually, I'd also like to *run* some services on that analyser. Besides, it's interesting.