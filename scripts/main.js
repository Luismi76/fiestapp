// ===========================
// NAVIGATION & ROUTING
// ===========================

// Simple router for prototype navigation
const navigate = (page) => {
    window.location.href = page;
};

// ===========================
// AUTH FORMS
// ===========================

document.addEventListener('DOMContentLoaded', () => {
    // Login form handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            // Simulate login success
            setTimeout(() => {
                navigate('profile-creation.html');
            }, 500);
        });
    }

    // Register form handler
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            // Simulate registration success
            setTimeout(() => {
                navigate('profile-creation.html');
            }, 500);
        });
    }
});

// ===========================
// MOCK DATA
// ===========================

const mockData = {
    festivals: [
        'Feria de Abril (Sevilla)',
        'San Fermín (Pamplona)',
        'Las Fallas (Valencia)',
        'Semana Santa (Sevilla)',
        'Carnaval (Cádiz)',
        'La Tomatina (Buñol)',
        'Feria de Málaga',
        'Aste Nagusia (Bilbao)'
    ],
    
    cities: [
        'Sevilla', 'Madrid', 'Barcelona', 'Valencia', 'Málaga',
        'Bilbao', 'Pamplona', 'Cádiz', 'Granada', 'Córdoba'
    ],
    
    experiences: [
        {
            id: 1,
            userName: 'María',
            age: 28,
            city: 'Sevilla',
            festival: 'Feria de Abril',
            description: 'Vive la Feria como sevillana auténtica',
            price: 45,
            type: 'pago',
            rating: 4.8,
            image: 'https://via.placeholder.com/300x200/FF6B35/FFFFFF?text=Feria+de+Abril'
        },
        {
            id: 2,
            userName: 'Carlos',
            age: 32,
            city: 'Pamplona',
            festival: 'San Fermín',
            description: 'Experimenta los Sanfermines desde dentro',
            price: null,
            type: 'intercambio',
            rating: 4.9,
            image: 'https://via.placeholder.com/300x200/8B5CF6/FFFFFF?text=San+Fermin'
        },
        {
            id: 3,
            userName: 'Ana',
            age: 25,
            city: 'Valencia',
            festival: 'Las Fallas',
            description: 'Disfruta las Fallas con una valenciana local',
            price: 50,
            type: 'ambos',
            rating: 4.7,
            image: 'https://via.placeholder.com/300x200/F7931E/FFFFFF?text=Las+Fallas'
        }
    ],
    
    matches: [
        {
            id: 1,
            userName: 'Ana',
            festival: 'Música Electrónica',
            lastMessage: '¡Hola! ¿Vas al festival este fin de semana?',
            timestamp: '10:45 AM',
            unread: 2,
            status: 'aceptado'
        },
        {
            id: 2,
            userName: 'Carlos',
            festival: 'Rock/Pop',
            lastMessage: 'Confirmado, nos vemos...',
            timestamp: 'Ayer',
            unread: 0,
            status: 'aceptado'
        },
        {
            id: 3,
            userName: 'Lucía',
            festival: 'Cine & Arte',
            lastMessage: 'Me parece bien',
            timestamp: 'Ayer',
            unread: 3,
            status: 'pendiente'
        }
    ]
};

// Export for use in other pages
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { navigate, mockData };
}
