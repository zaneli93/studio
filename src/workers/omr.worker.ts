// This is a separate file for the Web Worker
// It has to be self-contained and cannot import from other files.

declare var cv: any;

const NUM_QUESTIONS = 20; // Example: 20 questions
const NUM_OPTIONS = 5;   // A, B, C, D, E

self.onmessage = (event) => {
  const { imageDataUrl } = event.data;
  
  const img = new Image();
  img.src = imageDataUrl;
  img.onload = () => {
    try {
      const src = cv.imread(img);
      const result = processOMR(src);
      self.postMessage({ type: 'SUCCESS', payload: result });
      src.delete();
    } catch (error: any) {
      console.error('Error in OMR worker:', error);
      self.postMessage({ type: 'ERROR', payload: error.message || 'An unknown error occurred during processing.' });
    }
  };
  img.onerror = () => {
      self.postMessage({ type: 'ERROR', payload: 'Failed to load image in worker.' });
  }
};

function processOMR(src: any) {
    // 1. Pre-processing
    const gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    const blurred = new cv.Mat();
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

    const thresh = new cv.Mat();
    cv.threshold(blurred, thresh, 0, 255, cv.THRESH_BINARY_INV | cv.THRESH_OTSU);

    // 2. Find contours to locate anchors
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(thresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    // Filter contours to find potential squares (anchors)
    const potentialAnchors = [];
    for (let i = 0; i < contours.size(); ++i) {
        const cnt = contours.get(i);
        const area = cv.contourArea(cnt);
        if (area > 1000) { // Filter by area to avoid noise
            const peri = cv.arcLength(cnt, true);
            const approx = new cv.Mat();
            cv.approxPolyDP(cnt, approx, 0.02 * peri, true);
            if (approx.rows === 4) { // It's a quadrilateral
                potentialAnchors.push({ contour: cnt, area: area, approx: approx });
            } else {
              approx.delete();
            }
        }
        cnt.delete();
    }
    
    // Sort by area and take the 4 largest ones
    potentialAnchors.sort((a, b) => b.area - a.area);
    const anchors = potentialAnchors.slice(0, 4);

    if (anchors.length < 4) {
        cleanup(gray, blurred, thresh, contours, hierarchy, potentialAnchors);
        throw new Error("Could not find 4 anchors. Please retake the picture.");
    }
    
    // 3. Perspective Correction
    const anchorPoints = anchors.map(a => {
        const rect = cv.boundingRect(a.contour);
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    });

    // Sort points: tl, tr, br, bl
    anchorPoints.sort((a, b) => a.y - b.y); // Sort by y
    const top = anchorPoints.slice(0, 2).sort((a, b) => a.x - b.x);
    const bottom = anchorPoints.slice(2, 4).sort((a, b) => a.x - b.x);
    const sortedAnchorPoints = [top[0], top[1], bottom[1], bottom[0]]; // tl, tr, br, bl

    // A4 ratio, let's define a target size
    const width = 595; // A4 aspect ratio approximation
    const height = 842;

    const dsize = new cv.Size(width, height);
    const srcTri = cv.matFrom_p_p(
        sortedAnchorPoints.flatMap(p => [p.x, p.y]),
        cv.CV_32FC2
    );
    const dstTri = cv.matFrom_p_p(
        [0, 0, width, 0, width, height, 0, height],
        cv.CV_32FC2
    );

    const M = cv.getPerspectiveTransform(srcTri, dstTri);
    const warped = new cv.Mat();
    cv.warpPerspective(gray, warped, M, dsize);

    // 4. OMR Bubble Detection
    const answers = [];
    const questionRowHeight = height / NUM_QUESTIONS;
    const optionColWidth = width / NUM_OPTIONS;
    const optionLabels = ['A', 'B', 'C', 'D', 'E'];
    
    for (let i = 0; i < NUM_QUESTIONS; i++) {
        let maxFilled = -1;
        let selectedOption = '-';

        for (let j = 0; j < NUM_OPTIONS; j++) {
            const x = j * optionColWidth;
            const y = i * questionRowHeight;
            const roiRect = new cv.Rect(x, y, optionColWidth, questionRowHeight);
            const roi = warped.roi(roiRect);

            // Threshold the region of interest to count black pixels
            const roiThresh = new cv.Mat();
            cv.threshold(roi, roiThresh, 0, 255, cv.THRESH_BINARY_INV | cv.THRESH_OTSU);

            const filledPixels = cv.countNonZero(roiThresh);
            const totalPixels = roi.rows * roi.cols;
            const filledRatio = filledPixels / totalPixels;

            if (filledRatio > 0.4 && filledRatio > maxFilled) { // 40% threshold for a bubble to be considered 'filled'
                 maxFilled = filledRatio;
                 selectedOption = optionLabels[j];
            }
            roi.delete();
            roiThresh.delete();
        }
        answers.push(selectedOption);
    }


    // 5. Cleanup memory
    cleanup(gray, blurred, thresh, contours, hierarchy, potentialAnchors, srcTri, dstTri, M, warped);

    return answers;
}

function cleanup(...mats: any[]) {
    mats.forEach(mat => {
        if (mat && mat.delete && !mat.isDeleted()) {
            mat.delete();
        } else if (Array.isArray(mat)) {
            mat.forEach(item => {
                if(item.contour && item.contour.delete && !item.contour.isDeleted()) item.contour.delete();
                if(item.approx && item.approx.delete && !item.approx.isDeleted()) item.approx.delete();
            })
        }
    });
}
