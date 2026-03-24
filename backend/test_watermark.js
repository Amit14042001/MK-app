const sharp = require('sharp');
const fs = require('fs');

async function test() {
    try {
        const svgText = `<svg width="260" height="50"><rect width="240" height="40" x="10" y="5" fill="#F8C128" fill-opacity="0.95" rx="4"/><text x="130" y="31" font-family="sans-serif" font-size="17" font-weight="bold" fill="#111" text-anchor="middle">ServeNow Certified</text></svg>`;
        
        let buffer = await sharp({
            create: {
                width: 800,
                height: 600,
                channels: 4,
                background: { r: 200, g: 0, b: 0, alpha: 1 }
            }
        }).jpeg().toBuffer();
        
        buffer = await sharp(buffer)
            .composite([{ input: Buffer.from(svgText), gravity: 'southeast' }])
            .toBuffer();
            
        fs.writeFileSync('uploads/test_watermark.jpg', buffer);
        console.log("Success");
    } catch(err) {
        console.error("Fail", err);
    }
}
test();
