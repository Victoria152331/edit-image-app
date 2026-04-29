importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js');

function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
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
    return [h, s, l];
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

let model = null;

async function loadModel() {
    if (model) return model;
    model = await tf.loadGraphModel('./model/model.json');
    return model;
}

function resizeToTensor(data, srcWidth, srcHeight, targetSize = 96) {
    const canvas = new OffscreenCanvas(targetSize, targetSize);
    const ctx = canvas.getContext('2d');

    const tmpCanvas = new OffscreenCanvas(srcWidth, srcHeight);
    const tmpCtx = tmpCanvas.getContext('2d');
    const imageData = new ImageData(new Uint8ClampedArray(data), srcWidth, srcHeight);
    tmpCtx.putImageData(imageData, 0, 0);

    ctx.drawImage(tmpCanvas, 0, 0, targetSize, targetSize);
    const smallData = ctx.getImageData(0, 0, targetSize, targetSize).data;

    const float32 = new Float32Array(targetSize * targetSize * 3);
    for (let i = 0, j = 0; i < smallData.length; i += 4, j += 3) {
        float32[j] = smallData[i] / 255;
        float32[j + 1] = smallData[i + 1] / 255;
        float32[j + 2] = smallData[i + 2] / 255;
    }
    return tf.tensor4d(float32, [1, targetSize, targetSize, 3]);
}

self.onmessage = async(e) => {
    const buffer = e.data.pixels;
    const width = e.data.width;
    const height = e.data.height;

    const data = new Uint8ClampedArray(buffer);

    await loadModel();

    self.postMessage({ type: 'progress', progress: 5 });

    const [brightness, contrast, saturation] = tf.tidy(() => {
        const tensor = resizeToTensor(data, width, height);
        return model.predict(tensor).dataSync();
    });

    self.postMessage({ type: 'progress', progress: 15 });

    /*
    brightness: от -0.4 до +0.4
    contrast:   от 0.7 до 1.5
    saturation: от 0.7 до 1.5
    */

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
                progress: 15 + Math.round((i / data.length) * 85)
            });
        }
    }

    self.postMessage({ type: 'done', pixels: data.buffer }, [data.buffer]);
};