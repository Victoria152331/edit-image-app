import {
    ensureInitialized,
    jsEncodeImage
} from 'https://esm.sh/elheif';

self.onmessage = async(event) => {
    try {
        const { rgba, width, height } = event.data;

        await ensureInitialized();

        const result = jsEncodeImage(
            new Uint8Array(rgba),
            width,
            height
        );

        if (result.err) {
            throw new Error(result.err);
        }

        const heicBuffer = result.data.slice().buffer;

        self.postMessage({
            ok: true,
            heicBuffer
        }, [heicBuffer]);

    } catch (error) {
        self.postMessage({
            ok: false,
            error: error.message || String(error)
        });
    }
};
