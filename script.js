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
// --- LÓGICA DA CALCULADORA DE JUROS COMPOSTOS ---
const calculateBtn = document.getElementById('calculateBtn');

if (calculateBtn) {
    calculateBtn.addEventListener('click', function() {
        const initialValue = parseFloat(document.getElementById('initialValue').value) || 0;
        const monthlyValue = parseFloat(document.getElementById('monthlyValue').value) || 0;
        const interestRate = parseFloat(document.getElementById('interestRate').value) / 100 || 0;
        const period = parseInt(document.getElementById('period').value) || 0;
        const resultContainer = document.getElementById('resultContainer');

        resultContainer.innerHTML = ''; // Limpa o resultado anterior

        if (interestRate <= 0 || period <= 0) {
            resultContainer.innerHTML = `<p class="error">Por favor, insira uma taxa de juros e um período válidos para calcular.</p>`;
            return;
        }

        let futureValue = initialValue;
        for (let i = 0; i < period; i++) {
            futureValue = futureValue * (1 + interestRate);
            futureValue += monthlyValue;
        }
        
        // Ajuste para o último aporte não render juros desnecessariamente
        futureValue -= monthlyValue;
        let finalValue = initialValue * Math.pow(1 + interestRate, period);
        if(interestRate > 0){
             finalValue += monthlyValue * ((Math.pow(1 + interestRate, period) - 1) / interestRate);
        } else {
             finalValue += monthlyValue * period;
        }


        const totalInvested = initialValue + (monthlyValue * period);
        const totalInterest = finalValue - totalInvested;

        const formatter = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        });

        resultContainer.innerHTML = `
            <h3>Resultado da Simulação:</h3>
            <p><strong>Total Acumulado:</strong> ${formatter.format(finalValue)}</p>
            <p><strong>Total Investido por Você:</strong> ${formatter.format(totalInvested)}</p>
            <p><strong>Total em Juros:</strong> <span class="success">${formatter.format(totalInterest)}</span></p>
        `;
    });
}
