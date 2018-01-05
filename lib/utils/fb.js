const pitft = require('pitft');
const _ = require('lodash');

const fb = pitft('/dev/fb1', false);
const fbDetails = {
    fb: fb,
    width: fb.size().width,
    height: fb.size().height
};

module.exports = {
    getFramebufferDetails: () => {
        return fbDetails;
    },

    // This draws text, attempting to keep everything on screen by dropping a line
    // if required. It returns how many lines of text it's drawn
    drawText: (string, yOffset) => {
        // We're hardcoded to a particular typeface/size atm.
        fb.font('courier', 10);

        // Work out the size of the text comapred to that of the string.
        const words = string.split(' ');
        let lines = 1;
        let x = 0;
        let y = yOffset;

        _.each(words, (word) => {
            // We always draw the entire word, regardless.
            const wordLength = word.length * 7;
            const wordFit = ((wordLength + x) < fbDetails.width) ? true : false;
            if (!wordFit) {
                if (x > 10) {
                    x = 10;
                    y += 10;
                    lines++;
                }
            }
            fb.text(x, y, word, false, 0);

            // Word + space
            x += wordLength + 7;
        });

        return lines;
    }
}