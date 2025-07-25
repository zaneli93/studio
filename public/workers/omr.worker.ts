/// <reference lib="webworker" />

declare var cv: any;

// A simple state to track if OpenCV is loaded
let cvReady = false;

self.onmessage = async (event) => {
    // Dynamically import the script if it's not already loaded.
    if (!cvReady) {
        try {
            self.importScripts("https://docs.opencv.org/4.x/opencv.js");
            cvReady = true;
        } catch (e) {
            postMessage({ type: 'ERROR', payload: 'Failed to load OpenCV script.' });
            return;
        }
    }
    
    // Wait until `cv` is available on the global scope.
    const waitForCv = async () => {
        if (typeof cv === 'undefined' || !cv.Mat) {
            await new Promise(resolve => setTimeout(resolve, 50));
            await waitForCv();
        }
    };
    await waitForCv();

    const { imageDataUrl } = event.data;

    try {
        const image = await loadImage(imageDataUrl);
        const src = cv.imread(image);

        // 1. Anchor Detection
        const gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

        const blurred = new cv.Mat();
        cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

        const thresh = new cv.Mat();
        cv.threshold(blurred, thresh, 0, 255, cv.THRESH_BINARY_INV | cv.THRESH_OTSU);

        let contours = new cv.MatVector();
        let hierarchy = new cv.Mat();
        cv.findContours(thresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

        let anchors = findAnchorPoints(contours);

        if (anchors.length !== 4) {
            throw new Error(`Detecção de âncora falhou. Esperado 4, encontrado ${anchors.length}.`);
        }
        
        // 2. Perspective Transform
        const warped = warpPerspective(src, anchors);

        // 3. OMR Bubble Detection
        const answers = detectBubbles(warped);

        postMessage({ type: 'SUCCESS', payload: answers });
        
        // Clean up
        src.delete(); gray.delete(); blurred.delete(); thresh.delete(); contours.delete(); hierarchy.delete(); warped.delete();
        anchors.forEach(a => a.contour.delete());

    } catch (error: any) {
        postMessage({ type: 'ERROR', payload: error.message });
    }
};

function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new self.Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(err);
        img.src = url;
    });
}

function findAnchorPoints(contours: any) {
    let anchorCandidates = [];
    for (let i = 0; i < contours.size(); ++i) {
        const cnt = contours.get(i);
        const area = cv.contourArea(cnt);
        const peri = cv.arcLength(cnt, true);
        const approx = new cv.Mat();
        cv.approxPolyDP(cnt, approx, 0.04 * peri, true);
        
        if (area > 400 && approx.rows === 4) {
            const rect = cv.boundingRect(cnt);
            const aspectRatio = rect.width / parseFloat(rect.height);
            if (aspectRatio >= 0.9 && aspectRatio <= 1.1) {
                 anchorCandidates.push({ contour: cnt, area: area, rect: rect });
            }
        }
        approx.delete();
    }

    // Sort by area descending and take top 4
    anchorCandidates.sort((a, b) => b.area - a.area);
    return anchorCandidates.slice(0, 4);
}

function orderPoints(points: {x:number, y:number}[]) {
    points.sort((a, b) => a.y - b.y);
    const topPoints = points.slice(0, 2).sort((a, b) => a.x - b.x);
    const bottomPoints = points.slice(2, 4).sort((a, b) => a.x - b.x);
    return [topPoints[0], topPoints[1], bottomPoints[1], bottomPoints[0]]; // tl, tr, br, bl
}


function warpPerspective(src: any, anchors: any[]) {
    const anchorRects = anchors.map(a => a.rect);
    const points = anchorRects.map(r => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 }));
    const orderedPoints = orderPoints(points);

    // Assuming A4 ratio for output
    const width = 595;
    const height = 842;

    const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [orderedPoints[0].x, orderedPoints[0].y, orderedPoints[1].x, orderedPoints[1].y, orderedPoints[2].x, orderedPoints[2].y, orderedPoints[3].x, orderedPoints[3].y]);
    const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, width, 0, width, height, 0, height]);
    
    const M = cv.getPerspectiveTransform(srcTri, dstTri);
    const warped = new cv.Mat();
    cv.warpPerspective(src, warped, M, new cv.Size(width, height));
    
    srcTri.delete(); dstTri.delete(); M.delete();
    return warped;
}

function detectBubbles(warped: any) {
    const warpedGray = new cv.Mat();
    cv.cvtColor(warped, warpedGray, cv.COLOR_RGBA2GRAY);

    const warpedThresh = new cv.Mat();
    cv.threshold(warpedGray, warpedThresh, 0, 255, cv.THRESH_BINARY_INV | cv.THRESH_OTSU);
    
    // This is a placeholder for a real implementation.
    // In a real scenario, you'd have defined regions for questions.
    const NUM_QUESTIONS = 50; // Example
    const OPTIONS = ['A', 'B', 'C', 'D', 'E'];
    const results = [];
    
    const questionsPerPage = 50;
    const boxHeight = warped.rows / questionsPerPage;
    const optionWidth = warped.cols / OPTIONS.length;
    
    for(let i=0; i<NUM_QUESTIONS; i++) {
        let questionScores = [];
        for(let j=0; j<OPTIONS.length; j++) {
            const roiRect = new cv.Rect(j * optionWidth, i * boxHeight, optionWidth, boxHeight);
            const roi = warpedThresh.roi(roiRect);
            const score = cv.countNonZero(roi) / (roiRect.width * roiRect.height);
            questionScores.push({option: OPTIONS[j], score: score});
            roi.delete();
        }
        
        questionScores.sort((a,b) => b.score - a.score);
        if(questionScores[0].score > 0.4) { // Threshold for a marked bubble
             results.push(questionScores[0].option);
        } else {
             results.push('N/A'); // No bubble detected
        }
    }

    warpedGray.delete();
    warpedThresh.delete();

    return results;
}
