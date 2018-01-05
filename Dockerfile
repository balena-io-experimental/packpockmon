FROM resin/raspberrypi3-node:latest

WORKDIR /usr/src/app

RUN apt-get update && \
    apt-get install -yq \
     libcairo2-dev wget libpcap-dev \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY package.json package.json

RUN wget "https://code.wireshark.org/review/gitweb?p=wireshark.git;a=blob_plain;f=manuf" -O oui-mac.txt

RUN JOBS=MAX npm install --production --unsafe-perm && npm cache clean --force && rm -rf /tmp/*

COPY . ./

CMD ["npm", "start"]