const worker = new Worker('worker.js');

const input = document.createElement('input');
input.type = 'file';
input.accept = 'image/*';

const button = document.createElement('button');
button.textContent = 'Выбрать изображение';
button.onclick = () => input.click();
document.body.appendChild(button);

const progressBar = document.createElement('progress');
progressBar.max = 100;
progressBar.value = 0;
document.body.appendChild(progressBar);

const formatSelect = document.createElement('select');
['image/jpeg', 'image/png', 'image/webp'].forEach(format => {
    const option = document.createElement('option');
    option.value = format;
    option.textContent = format.split('/')[1].toUpperCase();
    formatSelect.appendChild(option);
});
document.body.appendChild(formatSelect);

const downloadButton = document.createElement('button');
downloadButton.textContent = 'Скачать';
downloadButton.disabled = true;
document.body.appendChild(downloadButton);



input.onchange = (e) => {
    progressBar.value = 0;
    const file = e.target.files[0];
    const url = URL.createObjectURL(file);

    const img = new Image();
    img.src = url;
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        console.log(`Размер: ${img.width}×${img.height}, пикселей: ${img.width * img.height / 1000000} Мпк`);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const buffer = imageData.data.buffer;
        worker.postMessage({ pixels: buffer, width: img.width, height: img.height }, [buffer]);
        worker.onmessage = (e) => {
            if (e.data.type === 'progress') {
                progressBar.value = e.data.progress;
            }
            if (e.data.type === 'done') {
                progressBar.value = 100;
                const pixels = new Uint8ClampedArray(e.data.pixels);
                const newImageData = new ImageData(pixels, canvas.width, canvas.height);
                ctx.putImageData(newImageData, 0, 0);
                document.body.appendChild(canvas);
                console.log('Готово!');

                downloadButton.disabled = false;

                downloadButton.onclick = () => {
                    const format = formatSelect.value;
                    const extension = format.split('/')[1];

                    canvas.toBlob((blob) => {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `result.${extension}`;
                        a.click();
                        URL.revokeObjectURL(url);
                    }, format);
                };
            }
        };
    };
};