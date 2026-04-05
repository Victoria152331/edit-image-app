function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // серый
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }
        h /= 6;
    }
    return [h, s, l]; // все значения от 0 до 1
}

function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    return [r * 255, g * 255, b * 255];
}

self.onmessage = (e) => {
    const buffer = e.data.pixels;
    const width = e.data.width;
    const height = e.data.height;

    const data = new Uint8ClampedArray(buffer);

    /*
    brightness: от -0.4 до +0.4
    contrast:   от 0.7 до 1.5
    saturation: от 0.7 до 1.5
    */

    const brightness = 0.2;
    const contrast = 1.0;
    const saturation = 1.0;

    for (let i = 0; i < data.length; i += 4) {

        const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2])

        let newL = Math.max(0, Math.min(1, l + brightness));
        newL = Math.max(0, Math.min(1, (newL - 0.5) * contrast + 0.5));
        let newS = Math.max(0, Math.min(1, s * saturation));

        const [r, g, b] = hslToRgb(h, newS, newL);

        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;

        if (i % Math.round(data.length / 20) === 0) {
            self.postMessage({
                type: 'progress',
                progress: Math.round(i / data.length * 100)
            });
        }
    }

    self.postMessage({ type: 'done', pixels: data.buffer }, [data.buffer]);
};