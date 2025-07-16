document.addEventListener('DOMContentLoaded', function() {

    // --- LÓGICA DO MENU MOBILE (HAMBURGUER) ---
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mainNav = document.querySelector('.main-nav');

    if (mobileMenuToggle && mainNav) {
        mobileMenuToggle.addEventListener('click', function() {
            mainNav.classList.toggle('active');
            const icon = mobileMenuToggle.querySelector('i');
            if (mainNav.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    }

    // --- LÓGICA PARA O POP-UP "SOBRE" ---
    const sobreLink = document.getElementById('sobre-link');
    const modalOverlay = document.getElementById('sobre-modal-overlay');
    const modalCloseBtn = document.getElementById('modal-close-btn');

    function openModal(event) {
        event.preventDefault(); 
        if (modalOverlay) {
            modalOverlay.classList.add('active');
        }
    }

    function closeModal() {
        if (modalOverlay) {
            modalOverlay.classList.remove('active');
        }
    }

    // Adiciona evento de clique para todos os links que devem abrir o modal
    const sobreLinks = document.querySelectorAll('#sobre-link, #sobre-link-footer');
    sobreLinks.forEach(link => {
        if(link) link.addEventListener('click', openModal);
    });

    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', closeModal);
    }
    if (modalOverlay) {
        modalOverlay.addEventListener('click', function(event) {
            if (event.target === modalOverlay) {
                closeModal();
            }
        });
    }

});
