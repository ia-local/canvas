document.addEventListener('DOMContentLoaded', () => {
    // Références aux éléments du DOM
    const openAndroidModalBtn = document.getElementById('openAndroidModalBtn');
    const androidModal = document.getElementById('androidModal');
    const closeAndroidModalBtn = document.getElementById('closeAndroidModalBtn');

    // Fonction pour ouvrir le modal
    function openModal() {
        androidModal.classList.add('visible');
    }

    // Fonction pour fermer le modal
    function closeModal() {
        androidModal.classList.remove('visible');
    }

    // Écouteur d'événement pour ouvrir le modal
    if (openAndroidModalBtn) {
        openAndroidModalBtn.addEventListener('click', openModal);
    }

    // Écouteur d'événement pour fermer le modal via le bouton de fermeture
    if (closeAndroidModalBtn) {
        closeAndroidModalBtn.addEventListener('click', closeModal);
    }

    // Écouteur d'événement pour fermer le modal en cliquant en dehors du contenu
    if (androidModal) {
        androidModal.addEventListener('click', (event) => {
            // Vérifie si le clic est directement sur l'overlay (pas sur le contenu du modal)
            if (event.target === androidModal) {
                closeModal();
            }
        });
    }

    // Ici, vous pouvez ajouter des écouteurs pour chaque icône si vous voulez
    // qu'elles déclenchent des actions spécifiques.
    // Exemple (à étendre selon vos besoins) :
    const iconItems = document.querySelectorAll('.icon-item');
    iconItems.forEach(item => {
        item.addEventListener('click', () => {
            const iconLabel = item.querySelector('.icon-label').textContent;
            console.log(`Icône "${iconLabel}" cliquée !`);
            // Exemple : vous pourriez envoyer ce label à la zone de prompt
            // ou déclencher une fonction spécifique pour cette "fonctionnalité Android"
            // closeModal(); // Optionnel: fermer le modal après un clic d'icône
        });
    });
});
