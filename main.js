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

const ImageEnhancer = new(class extends EventTarget {
    constructor() {
        super();
        this.tasks = new Map();
    }

    submit(file) {
        const taskId = crypto.randomUUID();
        this.tasks.set(taskId, { status: 'pending', progress: 0, result: null });
        this._process(taskId, file);
        return taskId;
    }

    getStatus(taskId) {
        const task = this.tasks.get(taskId);
        return { status: task.status, progress: task.progress };
    }

    cancel(taskId) {
        const task = this.tasks.get(taskId);
        if (!task || task.status === 'done') return false;
        this._updateTask(taskId, 'cancelled', task.progress);
        return true;
    }

    getResult(taskId) {
        return this.tasks.get(taskId).result;
    }

    _updateTask(taskId, status, progress) {
        const task = this.tasks.get(taskId);
        task.status = status;
        task.progress = progress;
        this.dispatchEvent(new CustomEvent('statusChange', {
            detail: { taskId, status, progress }
        }));
    }

    _process(taskId, file) {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.src = url;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            this._updateTask(taskId, 'processing', 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const buffer = imageData.data.buffer;
            worker.postMessage({ pixels: buffer, width: img.width, height: img.height }, [buffer]);

            worker.onmessage = (e) => {
                if (this.tasks.get(taskId).status === 'cancelled') return;

                if (e.data.type === 'progress') {
                    this._updateTask(taskId, 'processing', e.data.progress);
                }
                if (e.data.type === 'done') {
                    const pixels = new Uint8ClampedArray(e.data.pixels);
                    const newImageData = new ImageData(pixels, canvas.width, canvas.height);
                    ctx.putImageData(newImageData, 0, 0);
                    this.tasks.get(taskId).result = canvas;
                    this._updateTask(taskId, 'done', 100);
                }
                if (e.data.type === 'error') {
                    this._updateTask(taskId, 'error', 0);
                }
            };
        };
    }
})();

input.onchange = (e) => {
    progressBar.value = 0;
    const file = e.target.files[0];
    downloadButton.disabled = true;
    const taskId = ImageEnhancer.submit(file);

    const onStatusChange = (e) => {
        if (e.detail.taskId !== taskId) return;
        progressBar.value = e.detail.progress;

        if (e.detail.status === 'done') {
            const canvas = ImageEnhancer.getResult(taskId);
            document.body.appendChild(canvas);
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
            ImageEnhancer.removeEventListener('statusChange', onStatusChange);
        }

        if (e.detail.status === 'error') {
            alert('Ошибка обработки');
            ImageEnhancer.removeEventListener('statusChange', onStatusChange);
        }
    };

    ImageEnhancer.addEventListener('statusChange', onStatusChange);

};