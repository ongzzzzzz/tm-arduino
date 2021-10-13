function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

class LineBreakTransformer {
	constructor() {
		// A container for holding stream data until a new line.
		this.chunks = "";
	}

	transform(chunk, controller) {
		// Append new chunks to existing chunks.
		this.chunks += chunk;
		// For each line breaks in chunks, send the parsed lines out.
		const lines = this.chunks.split("\r\n");
		this.chunks = lines.pop();
		lines.forEach((line) => controller.enqueue(line));
	}

	flush(controller) {
		// When the stream is closed, flush any remaining chunks out.
		controller.enqueue(this.chunks);
	}
}
