import {
    HandLandmarker,
    FilesetResolver
} from "@mediapipe/tasks-vision";

const video = document.getElementById("video");
const startButton = document.getElementById("startButton");
const result = document.getElementById("result");

let handLandmarker;
let cameraStream = null;
let detecting = false;


// --------------------------------------------------
// Cargar MediaPipe
// --------------------------------------------------

async function createHandLandmarker() {

    result.textContent = "Cargando IA...";

    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    handLandmarker = await HandLandmarker.createFromOptions(
        vision,
        {
            baseOptions: {
                modelAssetPath:
                    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
            },

            runningMode: "VIDEO",

            numHands: 1
        }
    );

    result.textContent = "IA cargada";
}


// --------------------------------------------------
// Activar cámara
// --------------------------------------------------

async function startCamera() {

    cameraStream = await navigator.mediaDevices.getUserMedia({
        video: true
    });

    video.srcObject = cameraStream;

    detecting = true;

    startButton.textContent = "Desactivar cámara";

    video.addEventListener("loadeddata", detectHands, {
        once: true
    });
}


// --------------------------------------------------
// Desactivar cámara
// --------------------------------------------------

function stopCamera() {

    detecting = false;

    if (cameraStream) {

        cameraStream.getTracks().forEach(track => {
            track.stop();
        });

        cameraStream = null;
    }

    video.srcObject = null;

    result.textContent = "Cámara desactivada";

    startButton.textContent = "Activar cámara";
}


// --------------------------------------------------
// Detectar si es pulgar arriba
// --------------------------------------------------

function isThumbsUp(landmarks) {

    // Puntos importantes del pulgar
    const thumbTip = landmarks[4];
    const thumbIP = landmarks[3];
    const thumbMCP = landmarks[2];

    // Puntas de los otros dedos
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];

    // Articulaciones PIP
    const indexPIP = landmarks[6];
    const middlePIP = landmarks[10];
    const ringPIP = landmarks[14];
    const pinkyPIP = landmarks[18];


    // El pulgar debe estar apuntando hacia arriba.
    const thumbUp =
        thumbTip.y < thumbIP.y &&
        thumbIP.y < thumbMCP.y;


    // Los otros cuatro dedos deben estar doblados.
    const fingersFolded =
        indexTip.y > indexPIP.y &&
        middleTip.y > middlePIP.y &&
        ringTip.y > ringPIP.y &&
        pinkyTip.y > pinkyPIP.y;


    return thumbUp && fingersFolded;
}


// --------------------------------------------------
// Detectar manos continuamente
// --------------------------------------------------

function detectHands() {

    if (!detecting || !handLandmarker) {
        return;
    }

    const now = performance.now();

    const detectionResult =
        handLandmarker.detectForVideo(video, now);


    // No hay ninguna mano
    if (detectionResult.landmarks.length === 0) {

        result.textContent = "No se detecta ninguna mano";

    }

    // Hay una mano
    else {

        const landmarks = detectionResult.landmarks[0];

        if (isThumbsUp(landmarks)) {

            result.textContent = "👍 PULGAR ARRIBA";

        } else {

            result.textContent = "✋ MANO DETECTADA";
        }
    }


    requestAnimationFrame(detectHands);
}


// --------------------------------------------------
// Botón
// --------------------------------------------------

startButton.addEventListener("click", async () => {

    // Si la cámara está funcionando, apagarla
    if (cameraStream) {

        stopCamera();

        return;
    }


    // Si está apagada, encenderla
    startButton.disabled = true;

    try {

        if (!handLandmarker) {
            await createHandLandmarker();
        }

        await startCamera();

    } catch (error) {

        console.error(error);

        result.textContent =
            "Error: " + error.message;

    } finally {

        startButton.disabled = false;
    }
});