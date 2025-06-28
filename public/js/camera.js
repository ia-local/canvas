// camera.js
// Ce script gère l'accès à la webcam et l'affichage du flux vidéo.

document.addEventListener('DOMContentLoaded', () => {
    // Références aux éléments du DOM qui afficheront le flux vidéo et le canvas
    const videoElement = document.getElementById('cameraFeed');
    const cameraIconBox = document.querySelector('.icon-item .icon-box i.fa-solid.fa-camera').closest('.icon-item');

    // Vérifie si les fonctions globales de l'application sont disponibles
    if (!window.app || !window.app.addMessage || !window.app.showWebXRScreen) {
        console.error("Erreur: Fonctions globales 'window.app' non trouvées. Assurez-vous que index.html les expose.");
        return;
    }

    /**
     * Démarre le flux vidéo de la webcam.
     */
    async function startCamera() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            window.app.addMessage('system', 'Votre navigateur ne supporte pas l\'accès à la caméra (getUserMedia).');
            console.error('getUserMedia n\'est pas supporté.');
            return;
        }

        try {
            // Affiche l'écran simulant l'expérience WebXR/Caméra
            window.app.showWebXRScreen();
            window.app.addMessage('system', 'Tentative de démarrage de la caméra...');

            // Demande l'accès à la caméra vidéo
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });

            // Attribue le flux à l'élément vidéo
            videoElement.srcObject = stream;
            videoElement.play();

            // S'assure que la vidéo est visible et le texte caché
            videoElement.classList.remove('hidden');
            // Cache le texte "WebXR Content Here" car le flux vidéo prend le dessus
            videoElement.nextElementSibling.classList.add('hidden'); // Le p tag après la video

            window.app.addMessage('system', 'Caméra démarrée avec succès.');
            console.log('Caméra démarrée.');
        } catch (err) {
            console.error('Erreur lors de l\'accès à la caméra:', err);
            window.app.addMessage('system', `Impossible d'accéder à la caméra: ${err.name || err.message}.`);
            // En cas d'erreur, revenir à l'écran de chat ou d'accueil
            window.app.showChatScreen();
        }
    }

    /**
     * Arrête le flux vidéo de la webcam.
     */
    function stopCamera() {
        if (videoElement.srcObject) {
            videoElement.srcObject.getTracks().forEach(track => track.stop());
            videoElement.srcObject = null;
            videoElement.classList.add('hidden'); // Cache la vidéo
            // Affiche le texte "WebXR Content Here" à nouveau si la vidéo est cachée
            if (videoElement.nextElementSibling) {
                videoElement.nextElementSibling.classList.remove('hidden');
            }
            window.app.addMessage('system', 'Caméra arrêtée.');
            console.log('Caméra arrêtée.');
        }
    }

    // Expose les fonctions de la caméra via window.app pour qu'elles puissent être appelées depuis index.html ou pagination.js
    window.app.startCamera = startCamera;
    window.app.stopCamera = stopCamera;

    // Attache un écouteur d'événement à l'icône de la caméra pour démarrer le flux
    // Ceci complète l'action 'startWebXR' définie dans pagination.js
    if (cameraIconBox) {
        cameraIconBox.addEventListener('click', () => {
            // window.app.startWebXRSession sera appelé en premier par pagination.js,
            // qui à son tour appellera window.app.showWebXRScreen.
            // Nous démarrons la caméra ici pour l'intégration visuelle.
            if (cameraIconBox.querySelector('.icon-label').textContent === 'Caméra') {
                startCamera();
            }
        });
    }

    // Lorsque l'utilisateur revient à l'accueil ou au chat, assurez-vous d'arrêter la caméra
    const homeButton = document.getElementById('homeButton');
    if (homeButton) {
        homeButton.addEventListener('click', stopCamera);
    }
});
