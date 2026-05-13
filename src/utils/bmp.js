export function canvasToBmpBlob(canvas) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.getImageData(0, 0, width, height);
    const rgba = imageData.data;

    const rowSize = Math.floor((24 * width + 31) / 32) * 4;
    const pixelArraySize = rowSize * height;
    const fileSize = 54 + pixelArraySize;

    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);

    let offset = 0;

    view.setUint8(offset++, 0x42);
    view.setUint8(offset++, 0x4D);
    view.setUint32(offset, fileSize, true);
    offset += 4;
    view.setUint16(offset, 0, true);
    offset += 2;
    view.setUint16(offset, 0, true);
    offset += 2;
    view.setUint32(offset, 54, true);
    offset += 4;

    view.setUint32(offset, 40, true);
    offset += 4;
    view.setInt32(offset, width, true);
    offset += 4;
    view.setInt32(offset, height, true);
    offset += 4;
    view.setUint16(offset, 1, true);
    offset += 2;
    view.setUint16(offset, 24, true);
    offset += 2;
    view.setUint32(offset, 0, true);
    offset += 4;
    view.setUint32(offset, pixelArraySize, true);
    offset += 4;
    view.setInt32(offset, 2835, true);
    offset += 4;
    view.setInt32(offset, 2835, true);
    offset += 4;
    view.setUint32(offset, 0, true);
    offset += 4;
    view.setUint32(offset, 0, true);
    offset += 4;

    let pixelOffset = 54;

    for (let y = height - 1; y >= 0; y--) {
        let rowOffset = pixelOffset;

        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;

            view.setUint8(rowOffset++, rgba[i + 2]);
            view.setUint8(rowOffset++, rgba[i + 1]);
            view.setUint8(rowOffset++, rgba[i]);
        }

        pixelOffset += rowSize;
    }

    return new Blob([buffer], { type: 'image/bmp' });
}