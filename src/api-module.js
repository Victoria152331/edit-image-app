export const ImageEnhancer = new(class extends EventTarget {
    constructor() {
        super();
        this.tasks = new Map();
    }

    submit(file) {
        const taskId = crypto.randomUUID();
        this.tasks.set(taskId, {
            status: 'pending',
            progress: 0,
            result: null,
            worker: new Worker('./src/worker.js')
        });
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
        task.worker.terminate();
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

    async _process(taskId, file) {
        const task = this.tasks.get(taskId);
        const isHeic = file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic');
        const blob = isHeic ? await heic2any({ blob: file, toType: 'image/png' }) : file;
        const url = URL.createObjectURL(blob);
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
            task.worker.postMessage({ pixels: buffer, width: img.width, height: img.height }, [buffer]);

            task.worker.onmessage = (e) => {
                if (task.status === 'cancelled') return;

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
