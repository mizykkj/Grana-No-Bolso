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
        // Impede o link de pular para o topo da página (#)
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

    // Adiciona evento de clique para o link "Sobre" no menu
    if (sobreLink) {
        sobreLink.addEventListener('click', openModal);
    }
    // Adiciona evento de clique para o botão de fechar no modal
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', closeModal);
    }
    // Adiciona evento de clique para a área escura (fora da caixa) para fechar
    if (modalOverlay) {
        modalOverlay.addEventListener('click', function(event) {
            if (event.target === modalOverlay) {
                closeModal();
            }
        });
    }


    // --- LÓGICA AVANÇADA DA CALCULADORA DE JUROS COMPOSTOS ---
    const calculateBtn = document.getElementById('calculateBtn');

    if (calculateBtn) {
        calculateBtn.addEventListener('click', function() {
            // --- Coleta de dados ---
            const initialValue = parseFloat(document.getElementById('initialValue').value) || 0;
            const monthlyValue = parseFloat(document.getElementById('monthlyValue').value) || 0;
            let interestRate = parseFloat(document.getElementById('interestRate').value) || 0;
            let period = parseInt(document.getElementById('period').value) || 0;
            
            const interestRateType = document.getElementById('interestRateType').value;
            const periodType = document.getElementById('periodType').value;
    
            const resultContainer = document.getElementById('resultContainer');
            resultContainer.innerHTML = ''; // Limpa o resultado anterior
    
            // --- Normalização dos dados para MESES ---
            // Converte o período para meses, se estiver em anos
            let totalMonths = (periodType === 'years') ? period * 12 : period;
    
            // Converte a taxa de juros para uma taxa mensal, se estiver ao ano
            let monthlyInterestRate;
            if (interestRateType === 'yearly') {
                // Fórmula correta para converter taxa anual para mensal
                monthlyInterestRate = Math.pow((1 + interestRate / 100), (1/12)) - 1;
            } else {
                monthlyInterestRate = interestRate / 100;
            }
    
            // --- Validação ---
            if (monthlyInterestRate <= 0 || totalMonths <= 0) {
                resultContainer.innerHTML = `<p class="error">Por favor, insira uma taxa de juros e um período válidos para calcular.</p>`;
                return;
            }
    
            // --- Cálculo Final ---
            let finalValue = initialValue * Math.pow(1 + monthlyInterestRate, totalMonths);
            if(monthlyInterestRate > 0){
                 finalValue += monthlyValue * ((Math.pow(1 + monthlyInterestRate, totalMonths) - 1) / monthlyInterestRate);
            } else {
                 finalValue += monthlyValue * totalMonths;
            }
    
            // --- Exibição dos resultados ---
            const totalInvested = initialValue + (monthlyValue * totalMonths);
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

});
