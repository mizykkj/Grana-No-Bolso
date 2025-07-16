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

    if (sobreLink) {
        sobreLink.addEventListener('click', openModal);
    }
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


    // --- LÓGICA CORRIGIDA DA CALCULADORA DE JUROS COMPOSTOS ---
    const calculateBtn = document.getElementById('calculateBtn');

    if (calculateBtn) {
        calculateBtn.addEventListener('click', function() {
            
            // 1. Coleta de todos os valores dos campos
            const initialValue = parseFloat(document.getElementById('initialValue').value) || 0;
            const monthlyValue = parseFloat(document.getElementById('monthlyValue').value) || 0;
            const interestRateInput = parseFloat(document.getElementById('interestRate').value) || 0;
            const periodInput = parseInt(document.getElementById('period').value) || 0;
            
            const interestRateType = document.getElementById('interestRateType').value;
            const periodType = document.getElementById('periodType').value;
    
            const resultContainer = document.getElementById('resultContainer');
            resultContainer.innerHTML = '';

            // 2. Normalização dos dados para uma base MENSAL
            // Variáveis que usaremos no cálculo final
            let totalMonths = 0;
            let monthlyInterestRate = 0;

            // Converte o período para meses
            if (periodType === 'years') {
                totalMonths = periodInput * 12;
            } else {
                totalMonths = periodInput;
            }

            // Converte a taxa de juros para uma taxa MENSAL decimal
            if (interestRateType === 'yearly') {
                // Fórmula correta para converter taxa anual para mensal
                monthlyInterestRate = Math.pow(1 + (interestRateInput / 100), 1 / 12) - 1;
            } else {
                monthlyInterestRate = interestRateInput / 100;
            }

            // 3. Validação dos dados convertidos
            if (totalMonths <= 0 || monthlyInterestRate <= 0) {
                resultContainer.innerHTML = `<p class="error">Por favor, insira uma taxa de juros e um período válidos.</p>`;
                return;
            }

            // 4. Cálculo final com os valores já em meses
            let finalValue = initialValue * Math.pow(1 + monthlyInterestRate, totalMonths);
            
            if (monthlyValue > 0) {
                finalValue += monthlyValue * ( (Math.pow(1 + monthlyInterestRate, totalMonths) - 1) / monthlyInterestRate );
            }
    
            const totalInvested = initialValue + (monthlyValue * totalMonths);
            const totalInterest = finalValue - totalInvested;
    
            // 5. Formatação e Exibição do Resultado
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

});
