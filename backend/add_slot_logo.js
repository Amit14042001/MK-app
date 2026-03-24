const sharp = require('sharp');
const fs = require('fs');

async function addLogo() {
    try {
        const inputBuffer = fs.readFileSync('bridal_temp.jpg');
        
        // Let's create a badge that says SLOT to overlay on the image
        // It looks like a logo badge which can simulate a uniform logo or certified badge
        const svgText = `
        <svg width="250" height="70">
            <rect width="230" height="50" x="10" y="10" fill="#0B1C3F" rx="8"/>
            <text x="125" y="42" font-family="sans-serif" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle">SLOT</text>
        </svg>`;
        
        // the original image is webp, we save to png
        await sharp(inputBuffer)
            .composite([
                { 
                    input: Buffer.from(svgText), 
                    gravity: 'northeast', // top right or somewhere visible
                    blend: 'over'
                }
            ])
            .toFormat('png')
            .toFile('../frontend/public/images/services/bridal-makeup.png');
            
        console.log("Image updated successfully");
    } catch(err) {
        console.error("Error updating image:", err);
    }
}

addLogo();
