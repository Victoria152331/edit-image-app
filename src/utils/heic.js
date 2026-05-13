export async function canvasToHeicBlob(canvas) {
    return new Promise((resolve, reject) => {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
            reject(new Error('Cannot get canvas context'));
            return;
        }

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const worker = new Worker('./src/workers/heicWorker.js', {
            type: 'module'
        });

        worker.onmessage = (event) => {
            worker.terminate();

            const { ok, heicBuffer, error } = event.data;

            if (!ok) {
                reject(new Error(error));
                return;
            }

            resolve(new Blob([heicBuffer], { type: 'image/heic' }));
        };

        worker.onerror = (error) => {
            worker.terminate();
            reject(error);
        };

        worker.postMessage({
            rgba: imageData.data.buffer,
            width: canvas.width,
            height: canvas.height
        }, [imageData.data.buffer]);
    });
}