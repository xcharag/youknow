export function initCarousel(carouselId) {
    // Estado del carrusel
    let currentIndex = 0;
    let totalItems = 0;
    let isAnimating = false;
    let intervalId = null;
    const autoplayDelay = 5000; // 5 segundos entre diapositivas

    // Referencias a elementos DOM
    const carouselElement = document.getElementById(carouselId);
    if (!carouselElement) return;

    const carouselItems = carouselElement.querySelectorAll('.carousel-item');
    totalItems = carouselItems.length;

    const prevButton = carouselElement.querySelector('.carousel-control.prev');
    const nextButton = carouselElement.querySelector('.carousel-control.next');
    const indicators = carouselElement.querySelectorAll('.indicator');

    // Inicializar
    startAutoplay();
    setupEventListeners();
    updateActiveState();

    // Inicia el autoplay
    function startAutoplay() {
        clearInterval(intervalId);
        intervalId = setInterval(() => {
            goToSlide((currentIndex + 1) % totalItems);
        }, autoplayDelay);
    }

    // Configurar eventos
    function setupEventListeners() {
        // Botones de navegación
        if (prevButton) {
            prevButton.addEventListener('click', () => {
                goToSlide((currentIndex - 1 + totalItems) % totalItems);
            });
        }

        if (nextButton) {
            nextButton.addEventListener('click', () => {
                goToSlide((currentIndex + 1) % totalItems);
            });
        }

        // Indicadores
        indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', () => {
                goToSlide(index);
            });
        });

        // Pausar en hover
        carouselElement.addEventListener('mouseenter', () => {
            clearInterval(intervalId);
        });

        carouselElement.addEventListener('mouseleave', () => {
            startAutoplay();
        });

        // Soporte táctil para móviles
        let touchStartX = 0;
        carouselElement.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        carouselElement.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].screenX;
            const diff = touchStartX - touchEndX;

            // Si el deslizamiento es significativo
            if (Math.abs(diff) > 50) {
                if (diff > 0) {
                    // Deslizar a la izquierda -> siguiente
                    goToSlide((currentIndex + 1) % totalItems);
                } else {
                    // Deslizar a la derecha -> anterior
                    goToSlide((currentIndex - 1 + totalItems) % totalItems);
                }
            }
        }, { passive: true });

        // Teclas de dirección para navegación por teclado
        document.addEventListener('keydown', (e) => {
            // Solo actuar si el carrusel está visible en la ventana
            const rect = carouselElement.getBoundingClientRect();
            const isVisible = (
                rect.top >= 0 &&
                rect.bottom <= window.innerHeight
            );

            if (isVisible) {
                if (e.key === 'ArrowLeft') {
                    goToSlide((currentIndex - 1 + totalItems) % totalItems);
                } else if (e.key === 'ArrowRight') {
                    goToSlide((currentIndex + 1) % totalItems);
                }
            }
        });
    }

    // Actualizar el estado activo de los elementos
    function updateActiveState() {
        // Actualizar items
        carouselItems.forEach((item, index) => {
            if (index === currentIndex) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Actualizar indicadores
        indicators.forEach((indicator, index) => {
            if (index === currentIndex) {
                indicator.classList.add('active');
                indicator.setAttribute('aria-current', 'true');
            } else {
                indicator.classList.remove('active');
                indicator.removeAttribute('aria-current');
            }
        });
    }

    // Ir a una diapositiva específica
    function goToSlide(index) {
        if (isAnimating || index === currentIndex) return;

        isAnimating = true;

        // Cambiar clases para la animación
        carouselItems[currentIndex].classList.remove('active');
        carouselItems[index].classList.add('active');

        // Actualizar índice actual
        currentIndex = index;

        // Actualizar indicadores y estado
        updateActiveState();

        // Permitir siguiente animación después de completar la transición
        setTimeout(() => {
            isAnimating = false;
        }, 800); // Debe coincidir con la duración de la transición CSS

        // Reiniciar autoplay
        startAutoplay();
    }

    // APIs públicas
    return {
        goToSlide,

        next: () => {
            goToSlide((currentIndex + 1) % totalItems);
        },

        previous: () => {
            goToSlide((currentIndex - 1 + totalItems) % totalItems);
        },

        pause: () => {
            clearInterval(intervalId);
        },

        resume: () => {
            startAutoplay();
        },

        getCurrentIndex: () => {
            return currentIndex;
        }
    };
}

// Configurar la función de callback para mantener sincronizado el estado
window.setCarouselChangeCallback = function(dotNetInstance, methodName) {
    window.carouselDotNetInstance = dotNetInstance;
    window.carouselCallbackMethod = methodName;
};

// Modificación en initCarousel para notificar a .NET cuando cambia el índice
function notifyIndexChange(index) {
    if (window.carouselDotNetInstance && window.carouselCallbackMethod) {
        window.carouselDotNetInstance.invokeMethodAsync(window.carouselCallbackMethod, index);
    }
}

// Luego dentro de tu función goToSlide, agrega:
// notifyIndexChange(index);