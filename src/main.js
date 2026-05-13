import { ImageEnhancer } from './api-module.js';

const input = document.createElement('input');
input.type = 'file';
input.accept = 'image/*';

const button = document.createElement('button');
button.textContent = 'Выбрать изображение';
button.onclick = () => input.click();

const fileLabel = document.createElement('span');
fileLabel.textContent = '';

const progressBar = document.createElement('progress');
progressBar.max = 100;
progressBar.value = 0;

const formatSelect = document.createElement('select');

['image/jpeg', 'image/png', 'image/bmp', 'image/heic'].forEach(format => {
    const option = document.createElement('option');
    option.value = format;
    option.textContent = format.split('/')[1].toUpperCase();
    formatSelect.appendChild(option);
});

const downloadButton = document.createElement('button');
downloadButton.textContent = 'Скачать';
downloadButton.disabled = true;

// красиво отображаем

const wrapper = document.createElement('div');
wrapper.style.cssText = 'max-width: 600px; margin: 40px auto; font-family: sans-serif; display: flex; flex-direction: column; gap: 12px;';

const topRow = document.createElement('div');
topRow.style.cssText = 'display: flex; align-items: center; gap: 12px;';
topRow.appendChild(button);
topRow.appendChild(fileLabel);

progressBar.style.cssText = 'width: 100%; display: none;';

const bottomRow = document.createElement('div');
bottomRow.style.cssText = 'display: flex; align-items: center; gap: 12px;';
bottomRow.appendChild(downloadButton);
bottomRow.appendChild(formatSelect);

const previewContainer = document.createElement('div');

wrapper.appendChild(topRow);
wrapper.appendChild(progressBar);
wrapper.appendChild(bottomRow);
wrapper.appendChild(previewContainer);
document.body.appendChild(wrapper);

input.onchange = (e) => {
    progressBar.value = 0;
    const file = e.target.files[0];

    fileLabel.textContent = `Выбран файл: ${file.name}`;
    progressBar.style.display = 'block';
    progressBar.value = 0;
    previewContainer.innerHTML = '';

    downloadButton.disabled = true;
    const taskId = ImageEnhancer.submit(file);

    const onStatusChange = (e) => {
        if (e.detail.taskId !== taskId) return;
        progressBar.value = e.detail.progress;

        if (e.detail.status === 'done') {
            const canvas = ImageEnhancer.getResult(taskId);
            const preview = document.createElement('img');
            const maxSize = 560;
            const scale = Math.min(1, maxSize / Math.max(canvas.width, canvas.height));
            preview.width = Math.round(canvas.width * scale);
            preview.height = Math.round(canvas.height * scale);
            preview.src = canvas.toDataURL();
            preview.style.cssText = 'display: block; border-radius: 4px;';
            previewContainer.appendChild(preview);

            progressBar.style.display = 'none';

            downloadButton.disabled = false;
            downloadButton.onclick = () => {
                const format = formatSelect.value;
                const extension = format.split('/')[1];

                if (format === 'image/heic') {
                    canvas.toBlob(async(pngBlob) => {
                        const heicBlob = await heic2any({ blob: pngBlob, toType: 'image/heic' });
                        const url = URL.createObjectURL(heicBlob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'result.heic';
                        a.click();
                        URL.revokeObjectURL(url);
                    }, 'image/png');
                } else {
                    canvas.toBlob((blob) => {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `result.${extension}`;
                        a.click();
                        URL.revokeObjectURL(url);
                    }, format);
                }
            };

            ImageEnhancer.removeEventListener('statusChange', onStatusChange);
        }

        if (e.detail.status === 'error') {
            alert('Ошибка обработки');
            ImageEnhancer.removeEventListener('statusChange', onStatusChange);
        }
    };

    ImageEnhancer.addEventListener('statusChange', onStatusChange);

};
