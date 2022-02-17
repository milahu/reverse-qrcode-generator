<script>
	import * as qrcode from "qrcode"; // https://github.com/soldair/node-qrcode

	import memeHappyMerchant from "./meme-happy-merchant.jpg";

	const maxSize = 2331; // qr code size limit
	const minSize = 1;

	let fileList;
	let image;
	let imageSrc = memeHappyMerchant;
	const defaultImageSrc = memeHappyMerchant;
	let canvasCode;
	let canvasCode2;
	let canvasImage;
	let canvasImage2;

	// https://www.akashmittal.com/upload-file-svelte/
	function doUpload(event) {
		event.preventDefault();
		var file = fileList[0];
		var fileReader = new FileReader();
		fileReader.onload = function(event) {
			imageSrc = event.target.result;
		};
		fileReader.readAsDataURL(file);
	}

	let squareSizeCode;
	let squareSizeImage;

	let continueGuessing = false;


	let resultList = [];

	let resultListTopSorted = [];

	let maxGuessSteps = 10000;

	let progressDone = 0;

	let lowerDiff = null;
	let upperDiff = null;
	let lowerDiffText = '';
	let upperDiffText = '';

	function guessStep(guessIdx = 0) {

		if (continueGuessing == false || guessIdx > maxGuessSteps) {
			console.log(`stop guessing: continueGuessing = ${continueGuessing}`)
			console.log(`stop guessing: guessIdx = ${guessIdx} of ${maxGuessSteps}`)
			startStopGuessingButton.innerHTML = 'Start Guessing';
			showResult();
			return;
		}

		// actual data
		var textActual = getRandomText(textSize); // random text
		var codeActual = qrcode.create(textActual);
		var dataActual = codeActual.modules.data; // 0=white 1=black

		// diff
		var dataDifference = 0;
		var i4 = 0;
		for (var i = 0; i < constDataSize; i++) {
			dataDifference = dataDifference + ((dataExpected[i4] & 1) ^ dataActual[i]);
			i4 = i4 + 4;
		}

		//console.log(`${dataDifference} ${textActual}`)
		resultList.push({
			text: textActual,
			diff: dataDifference,
		})

		/*
		console.dir({
			dataDifference,
			dataActual,
			dataExpected,
		})
		*/

		if (dataDifference < lowerDiff) { // this result is better than the last result -> update code
			lowerDiff = dataDifference;
			lowerDiffText = textActual;
			//codeActual.toCanvas(canvasCode);
			qrcode.toCanvas(canvasCode, textActual, async function (error) {
				if (error) console.error(error)
				//await tick();
				// recurse
				// setTimeout -> keep UI responsive
				setTimeout(() => {
					guessStep(guessIdx + 1);
				}, 1);
			})
		}
		else if (dataDifference > upperDiff) { // this result is worse than the last result -> update code 2
			upperDiff = dataDifference;
			upperDiffText = textActual;
			//codeActual.toCanvas(canvasCode);
			qrcode.toCanvas(canvasCode2, textActual, async function (error) {
				if (error) console.error(error)
				//await tick();
				// recurse
				// setTimeout -> keep UI responsive
				setTimeout(() => {
					guessStep(guessIdx + 1);
				}, 1);
			})
		}
		else {
			if (guessIdx % 100 == 0) {
				progressDone = guessIdx; // update progress indicator
			}
			// recurse
			// setTimeout -> keep UI responsive
			setTimeout(() => {
				guessStep(guessIdx + 1);
			}, 1);
		}

	}

	let showResultDiv;

	function showResult() {
		var resultListTopSortedTemp = resultList.sort((a, b) => (a.diff - b.diff))
		var resultLength = 100;
		resultListTopSorted = resultListTopSortedTemp.slice(0, resultLength/2).concat(resultListTopSortedTemp.slice(-resultLength/2)) // best + worst
		// TODO which is more similar? first or last?

		var resultListTodoCanvas = resultListTopSorted.slice();
		showResultDiv.innerHTML = '';
		//codeActual.toCanvas(canvasCode);
		function showNextResultCode() {
			if (resultListTodoCanvas.length == 0) return;
			var result = resultListTodoCanvas.shift();
			var divResult = document.createElement('div');
			var textResult = document.createElement('div');
			textResult.innerHTML = `diff = ${result.diff} + text = ${result.text}`;
			var canvasResult = document.createElement('canvas');
			canvasResult.title = result.text;
			canvasResult.onclick = () => console.log(`result.text = ${result.text}`);
			divResult.appendChild(canvasResult);
			divResult.appendChild(textResult);
			showResultDiv.appendChild(divResult);
			qrcode.toCanvas(canvasResult, result.text, async function (error) {
				if (error) console.error(error)
				else {
					setTimeout(() => {
						showNextResultCode();
					}, 10);
				}
			})
		}
		showNextResultCode();
		return;
	}


	let constDataSize = 0;
	let dataExpected = null;

	let startStopGuessingButton;

	function stopGuessing() {
		continueGuessing = false;
	}

	function startStopGuessing(event) {
		if (continueGuessing) return stopGuessing();
		// start guessing
		startStopGuessingButton.innerHTML = 'Stop Guessing';
		resultList = [];
		continueGuessing = true;
		progressDone = 0;

		lowerDiff = +Infinity;
		upperDiff = 0;

		// expected data
		var ctxImage2 = canvasImage2.getContext('2d');
		var dataImage2 = ctxImage2.getImageData(0, 0, canvasImage2.width, canvasImage2.height);
		dataExpected = dataImage2.data; // srgb colorspace, 0=black 255=white

		constDataSize = squareSizeCode * squareSizeCode;

		guessStep();
	}

	let textSize = 106; // over 106 -> more reserved QR code bits
	let textSizeLive = textSize;

	import { onMount, tick } from "svelte";

	async function onChangeSize(event) {
		changeSize(event.target.valueAsNumber);
	}

	// https://stackoverflow.com/a/37714937/10440128
	function contrastImage(imageData, contrast) {  // contrast as an integer percent  
			var data = imageData.data;  // original array modified, but canvas not updated
			contrast *= 2.55; // or *= 255 / 100; scale integer percent to full range
			var factor = (255 + contrast) / (255.01 - contrast);  //add .1 to avoid /0 error

			for(var i=0;i<data.length;i+=4)  //pixel values in 4-byte blocks (r,g,b,a)
			{
					data[i] = factor * (data[i] - 128) + 128;     //r value
					data[i+1] = factor * (data[i+1] - 128) + 128; //g value
					data[i+2] = factor * (data[i+2] - 128) + 128; //b value

			}
			return imageData;  //optional (e.g. for filter function chaining)
	}

	async function changeSize(textSizeNew) {
		console.log(`textSize: ${textSize} -> ${textSizeNew}`)
		textSize = textSizeNew;
		//canvas.width = canvas.height = event.target.valueAsNumber;
    //var ctx = canvas.getContext("2d");
		//ctx.drawImage(image, 10, 10);
		await tick(); // wait

		showCode(getRandomText(textSize));

		squareSizeCode = qrcode.create(getRandomText(textSize)).modules.size;
		canvasImage.height = squareSizeCode;
		canvasImage.width = squareSizeCode;
		var ctxImage = canvasImage.getContext('2d');
		ctxImage.drawImage(image, 0, 0, squareSizeCode, squareSizeCode);
		console.log(`done canvasImage`)

		// increase contrast
    var dataImage = ctxImage.getImageData(0, 0, canvasImage.width, canvasImage.height);
    //contrastImage(dataImage, +0.50);
    contrastImage(dataImage, +100);
    //ctxImage.putImageData(dataImage, 0, 0);
		canvasImage2.height = squareSizeCode;
		canvasImage2.width = squareSizeCode;
		var ctxImage2 = canvasImage2.getContext('2d');
    ctxImage2.putImageData(dataImage, 0, 0);
		// TODO add reserved QR code bits to canvasImage2 = constant parts of QR code
	}

	// init
	//changeSize(textSize);
	setTimeout(() => { changeSize(textSize); }, 200); // TODO better. wait for image load?

	function showCode(text) {

		qrcode.toCanvas(canvasCode, text, function (error) {
			if (error) console.error(error)
			else console.log('success!');
		})

		if (image.height > image.width) {
			image.height = canvasCode.height;
			squareSizeImage = canvasCode.height;
		}
		else {
			image.width = canvasCode.width;
			squareSizeImage = canvasCode.width;
		}

	}


	// https://stackoverflow.com/a/1349426/10440128
	function getRandomText(length) {
		var result           = '';
		//var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		var characters       = '    ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		//var characters       = '           abcdefghijklmnopqrstuvwxyz';
		var charactersLength = characters.length;
		for ( var i = 0; i < length; i++ ) {
			result += characters.charAt(Math.floor(Math.random() * charactersLength));
		}
		return result;
	}
	//console.log(getRandomText(5));

	let render = () => undefined;

	onMount(() => {

		squareSizeImage = image.height; // TODO landscape images

		showCode(getRandomText(textSize))
		/*
		qrcode.toCanvas(canvas, getRandomText(1000), function (error) {
			if (error) console.error(error)
			else console.log('success!');
		})
		*/

		return;


	})

	function onImageLoad(event) {
		//console.log('onImageLoad', event.target)
		//var image = event.target;
		squareSizeImage = Math.max(image.height, image.width);
	}


	/*
	$: render = ({ context, width, height }) => {
		console.dir(image);
		if (image) context.drawImage(image, 10, 10);
		return;
		context.fillStyle = `hsl(${$t / 40}, 100%, 50%)`;
		context.beginPath();
		context.arc(($t / 4) % width, ($t / 4) % height, 100, 0, Math.PI * 2);
		context.fill();
	};
	*/
</script>

<main>
	<h2>Reverse QRCode Generator</h2>
	<div>naive implementation = brute force</div>

	<div>
		text length = {textSizeLive}
		<input type="range" min={minSize} max={maxSize} bind:value={textSizeLive} on:change={onChangeSize}/>
		<button bind:this={startStopGuessingButton} on:click={startStopGuessing}>Start Guessing</button>
	</div>

	<div class="flex-container">
		<div>
			<img alt="lol youre blind" bind:this={image} src={imageSrc} on:load={onImageLoad} />
		</div>
		<div>
			<!-- width + height is set by qrcode.toCanvas -->
			<canvas bind:this={canvasImage} style="height:{squareSizeImage}px;width:{squareSizeImage}px;image-rendering:pixelated;" />
		</div>
		<div>
			<!-- width + height is set by qrcode.toCanvas -->
			<canvas bind:this={canvasImage2} style="height:{squareSizeImage}px;width:{squareSizeImage}px;image-rendering:pixelated;" />
		</div>
		<div>
			<!-- width + height is set by qrcode.toCanvas -->
			<canvas bind:this={canvasCode} />
		</div>
		<div>
			<!-- width + height is set by qrcode.toCanvas -->
			<canvas bind:this={canvasCode2} />
		</div>
	</div>
	<div class="last-text">{lowerDiff} = {lowerDiffText}</div>
	<div class="last-text">{upperDiff} = {upperDiffText}</div>
	<form on:submit={doUpload}>
		<input type="file" bind:files={fileList} />
		<input type="submit" value="upload image" />
		<button on:click={() => { image.src = defaultImageSrc; }}>default image</button>
	</form>

	<div>done {progressDone} of {maxGuessSteps} guessing steps</div>

	<div bind:this={showResultDiv} class="result-codes"></div>



	<!--
		<Canvas width={size} height={size}>
			<Layer {render} />
		</Canvas>
	-->

</main>

<style>

	.flex-container {
		display: flex; width: 100%; justify-content: center;
	}
	.flex-container > div{
		margin-right: 10px
	}

	/*
	.result-codes {
		border: solid 1px red;
	}
	*/

	:global(.result-codes > *) {
		display: flex;
		/*
		width: 100%;
		justify-content: center;
		*/
	}

	:global(.result-codes > div) {
		width: 10em;
	}

	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

/*
	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}
*/

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>