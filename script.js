let portSel = document.getElementById("port-sel");
let connectBtn = document.getElementById("port-btn");
let scanBtn = document.getElementById("scan-btn");
let modelInp = document.getElementById("model-inp");
let modelBtn = document.getElementById("model-btn");

let modelContainer = document.getElementById("model-container");
let portContainer = document.getElementById("port-container");


// Classifier Variable
let classifier;

// Video
let video;
let flippedVideo;
// To store the classification
let label = "";

async function getModel() {
	return new Promise((resolve, reject) => {
		modelBtn.addEventListener('click', async () => {
			try {
				// test model: "https://teachablemachine.withgoogle.com/models/jzsaD4-DF/"
				// console.log(modelInp.value)
				classifier = ml5.imageClassifier(modelInp.value + 'model.json');

				modelContainer.style.display = "none";
				portContainer.style.display = "block";

				let res = await fetch(modelInp.value + "metadata.json");
				let metadata = await res.json();
				createConfidenceGraph(metadata.labels)

				resolve(classifier)
			} catch (e) {
				alert(`make sure ur model link is something like: \nhttps://teachablemachine.withgoogle.com/models/abcdefg/
				\nreload and try again :3
				\n${e}`)
				reject(e)
			}
		})
	})
}

async function getPort(ports) {
	return new Promise((resolve, reject) => {
		let port;

		scanBtn.addEventListener('click', async () => {
			// Prompt user to select any serial port.
			port = await navigator.serial.requestPort();
			if (!ports.includes(port)) ports.push(port);

			portSel.innerHTML = ''
			ports.forEach((p, i) => {
				let opt = document.createElement("option")
				let txtNode = document.createTextNode(
					`PID: ${p.getInfo().usbProductId} VID: ${p.getInfo().usbVendorId}`
				)
				opt.appendChild(txtNode);
				opt.value = i;
				portSel.appendChild(opt);
			})
			portSel.value = ports.length - 1
		})

		connectBtn.addEventListener('click', async () => {
			// console.log(sel.value)
			if (ports.length) {
				port = ports[portSel.value]
			} else {
				try {
					port = await navigator.serial.requestPort();
				} catch (e) {
					alert(`${e} \nmake sure ur arduino got connect and then reload the page~~`);
					reject(e)
				}
			}
			modelContainer.style.display = "none";
			portContainer.style.display = "none";
			resolve(port);
		})
	})
}

function createConfidenceGraph(labels) {
	let graphContainer = document.createElement("div");
	// graphContainer.style.backgroundColor = "pink"
	graphContainer.style.width = "100%"
	graphContainer.id = "graph-container"

	document.body.appendChild(graphContainer);
	labels.forEach(label => {
		/*
			graphContainer
				graphDiv
					labelTxt
					graph
				graphDiv
					labelTxt
					graph
		*/
		let graphDiv = document.createElement("div");
		graphDiv.style.width = "100%"
		graphDiv.style.height = "50px"
		graphDiv.classList.add("graph-div")
		graphContainer.appendChild(graphDiv);

		let labelTxtDiv = document.createElement("div");
		let labelTxt = document.createTextNode(label);
		labelTxtDiv.classList.add("graph-label");
		labelTxtDiv.appendChild(labelTxt);
		graphDiv.appendChild(labelTxtDiv);

		let graph = document.createElement("div");
		graph.style.width = "300px";
		graph.style.height = "50px";
		graphDiv.appendChild(graph)

		let graphBar = document.createElement("div");
		graphBar.id = `graph-${label}`;
		graphBar.style.width = "0%";
		graphBar.classList.add("graph-bar")
		graph.appendChild(graphBar)

		// console.log(label)
	})
}

async function setup() {
	createCanvas(320, 260);

	modelContainer.style.display = "block";
	portContainer.style.display = "none";

	// Get all serial ports the user has previously granted the website access to.
	const ports = await navigator.serial.getPorts();
	if (ports.length) {
		ports.forEach((p, i) => {
			let opt = document.createElement("option")
			let txtNode = document.createTextNode(
				`PID: ${p.getInfo().usbProductId} VID: ${p.getInfo().usbVendorId}`
			)
			opt.appendChild(txtNode);
			opt.value = i;
			portSel.appendChild(opt);

			// console.log(p)
			// console.log(Object.keys(p))
			// console.log(p.getInfo())
		})
	} else {
		// no ports found
		// portSel.style.display = "none";
	}

	classifier = await getModel();

	let port = await getPort(ports);
	// console.log(port)

	// Wait for the serial port to open.
	await port.open({ baudRate: 9600 });

	// Create the video
	video = createCapture(VIDEO);
	video.size(320, 240);
	video.hide();

	flippedVideo = ml5.flipImage(video);

	const textDecoder = new TextDecoderStream();
	const textEncoder = new TextEncoderStream();
	const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
	const writableStreamClosed = textEncoder.readable.pipeTo(port.writable);

	const reader = textDecoder.readable
		.pipeThrough(new TransformStream(new LineBreakTransformer()))
		.getReader();
	const writer = textEncoder.writable.getWriter();

	// Start classifying
	await classifyVideo(port, readableStreamClosed, writableStreamClosed, reader, writer);
}

function draw() {
	background(0);
	// Draw the video
	if (flippedVideo) {
		image(flippedVideo, 0, 0);
	} else {
		text("Loading...", width / 2, height / 2);
		if (mouseIsPressed == true) {
			fill(100);
		} else {
			fill(255);
		}
		ellipse(mouseX, mouseY, 25, 25)
	}

	// Draw the label
	fill(255);
	textSize(16);
	textAlign(CENTER);
	if (label) text(label, width / 2, height - 4);
}

// Get a prediction for the current video frame
async function classifyVideo(port, readableStreamClosed, writableStreamClosed, reader, writer) {
	flippedVideo = ml5.flipImage(video)
	classifier.classify(flippedVideo, async (error, results) => {
		// If there is an error
		if (error) {
			console.error(error);
			return;
		}
		// The results are in an array ordered by confidence.
		// console.log(results[0]);
		label = results[0].label;
		results.forEach(result => {
			document.getElementById(`graph-${result.label}`).style.width = `${result.confidence.toFixed(4) * 100}%`
			document.getElementById(`graph-${result.label}`).innerHTML
				= `${(result.confidence * 100).toString().slice(0, 4)}%`
			// document.getElementById(`graph-${result.label}`).innerHTML = result.confidence
		})

		// Classifiy again!
		await classifyVideo(port, readableStreamClosed, writableStreamClosed, reader, writer);
	});

	flippedVideo.remove();

	if (label) {
		// console.log(label)

		try {
			await writer.write(label + '\n');
			// // READ DATA SENT BY ARDUINO
			// while (true) {
			// 	const { value, done } = await reader.read();
			// 	// console.log('reading')
			// 	if (done) {
			// 		// Allow the serial port to be closed later.
			// 		reader.releaseLock();
			// 		break;
			// 	}
			// 	if (value) {
			// 		console.log(value);
			// 	}
			// }
		} catch (error) {
			// TODO: Handle non-fatal read error.
			console.error(error)
		}
	}

}










