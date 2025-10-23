const API_KEY = '123'; // API Key gratuita para testes
const BASE_URL = 'https://www.thesportsdb.com/api/v1/json';

// Estado da aplicação
let currentPage = 1;
let eventsPerPage = 12;
let allEvents = [];
let filteredEvents = [];

// Mapeamento de desportos para IDs da API
const sportIds = {
    'football': '4328',      // Soccer/Football
    'basketball': '4387',    // Basketball
    'volleyball': '4385'     // Volleyball
};

// Mapeamento de ligas
const leagueIds = {
    'premier': '4328',       // Premier League
    'liga': '4344',          // Liga Portugal
    'nba': '4387',           // NBA
    'champions': '4480'      // UEFA Champions League
};

// Função para formatar data
function formatDate(dateStr) {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const month = months[date.getMonth()];
    return { day, month };
}

// Função para formatar hora
function formatTime(timeStr) {
    if (!timeStr) return 'A definir';
    return timeStr.substring(0, 5);
}

// Função para obter ícone do desporto
function getSportIcon(sport) {
    const icons = {
        'Soccer': 'fa-futbol',
        'Basketball': 'fa-basketball-ball',
        'Volleyball': 'fa-volleyball-ball'
    };
    return icons[sport] || 'fa-calendar';
}

// Função para buscar eventos da próxima semana por liga
async function fetchEventsByLeague(leagueId) {
    try {
        const response = await fetch(`${BASE_URL}/${API_KEY}/eventsnextleague.php?id=${leagueId}`);
        const data = await response.json();
        return data.events || [];
    } catch (error) {
        console.error('Erro ao buscar eventos:', error);
        return [];
    }
}

// Função para buscar eventos por desporto
async function fetchEventsBySport(sportName) {
    try {
        const response = await fetch(`${BASE_URL}/${API_KEY}/eventsseason.php?id=${sportIds[sportName]}&s=2024-2025`);
        const data = await response.json();
        return data.events || [];
    } catch (error) {
        console.error('Erro ao buscar eventos por desporto:', error);
        return [];
    }
}

// Função para buscar todos os eventos
async function fetchAllEvents() {
    const events = [];
    
    // Buscar eventos das principais ligas
    const leagues = ['4328', '4344', '4387', '4480'];
    
    for (const leagueId of leagues) {
        const leagueEvents = await fetchEventsByLeague(leagueId);
        events.push(...leagueEvents);
    }
    
    // Filtrar apenas eventos futuros
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return events.filter(event => {
        const eventDate = new Date(event.dateEvent);
        return eventDate >= today;
    }).sort((a, b) => {
        return new Date(a.dateEvent) - new Date(b.dateEvent);
    });
}

// Função para criar card de evento
function createEventCard(event, viewType = 'list') {
    const { day, month } = formatDate(event.dateEvent);
    const time = formatTime(event.strTime);
    const sportIcon = getSportIcon(event.strSport);
    
    if (viewType === 'list') {
        return `
            <div class="event-card">
                <div class="event-date">
                    <span class="day">${day}</span>
                    <span class="month">${month}</span>
                </div>
                <div class="event-info">
                    <h3>${event.strEvent || event.strHomeTeam + ' vs ' + event.strAwayTeam}</h3>
                    <p><i class="fas ${sportIcon}"></i> ${event.strSport} - ${event.strLeague}</p>
                    <p><i class="far fa-clock"></i> ${time} ${event.strVenue ? '| ' + event.strVenue : ''}</p>
                </div>
            </div>
        `;
    } else {
        return `
            <div class="event-card-grid">
                <div class="event-header">
                    <span class="event-date-small">${day} ${month}</span>
                    <span class="event-time">${time}</span>
                </div>
                <div class="event-body">
                    <h3>${event.strEvent || event.strHomeTeam + ' vs ' + event.strAwayTeam}</h3>
                    <p><i class="fas ${sportIcon}"></i> ${event.strSport}</p>
                    <p class="league">${event.strLeague}</p>
                </div>
            </div>
        `;
    }
}

// Função para renderizar eventos
function renderEvents(viewType = 'list') {
    const container = document.getElementById('eventsContainer');
    
    if (filteredEvents.length === 0) {
        container.innerHTML = `
            <div class="no-events">
                <i class="fas fa-calendar-times"></i>
                <p>Nenhum evento encontrado com os filtros aplicados.</p>
            </div>
        `;
        return;
    }
    
    const start = (currentPage - 1) * eventsPerPage;
    const end = start + eventsPerPage;
    const eventsToShow = filteredEvents.slice(start, end);
    
    const containerClass = viewType === 'list' ? 'events-list' : 'events-grid';
    container.className = containerClass;
    
    container.innerHTML = eventsToShow.map(event => createEventCard(event, viewType)).join('');
    
    updatePagination();
}

// Função para atualizar paginação
function updatePagination() {
    const totalPages = Math.ceil(filteredEvents.length / eventsPerPage);
    document.getElementById('currentPage').textContent = currentPage;
    document.getElementById('totalPages').textContent = totalPages;
    
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages;
}

// Função para aplicar filtros
function applyFilters() {
    const sport = document.getElementById('sport').value;
    const league = document.getElementById('league').value;
    const date = document.getElementById('date').value;
    const team = document.getElementById('team').value.toLowerCase();
    
    filteredEvents = allEvents.filter(event => {
        if (sport !== 'all') {
            const sportMap = {
                'football': 'Soccer',
                'basketball': 'Basketball',
                'volleyball': 'Volleyball'
            };
            if (event.strSport !== sportMap[sport]) return false;
        }
        
        if (league !== 'all') {
            const leagueMap = {
                'premier': 'English Premier League',
                'liga': 'Portuguese Liga',
                'nba': 'NBA',
                'champions': 'UEFA Champions League'
            };
            if (!event.strLeague.includes(leagueMap[league])) return false;
        }
        
        if (date) {
            if (event.dateEvent !== date) return false;
        }
        
        if (team) {
            const eventName = (event.strEvent || '').toLowerCase();
            const homeTeam = (event.strHomeTeam || '').toLowerCase();
            const awayTeam = (event.strAwayTeam || '').toLowerCase();
            if (!eventName.includes(team) && !homeTeam.includes(team) && !awayTeam.includes(team)) {
                return false;
            }
        }
        
        return true;
    });
    
    currentPage = 1;
    renderEvents(document.querySelector('.view-btn.active').dataset.view);
}

// Função para limpar filtros
function resetFilters() {
    document.getElementById('sport').value = 'all';
    document.getElementById('league').value = 'all';
    document.getElementById('date').value = '';
    document.getElementById('team').value = '';
    
    filteredEvents = [...allEvents];
    currentPage = 1;
    renderEvents(document.querySelector('.view-btn.active').dataset.view);
}

// Inicialização
async function init() {
    // Mostrar loading
    const container = document.getElementById('eventsContainer');
    container.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p>A carregar eventos...</p>
        </div>
    `;
    
    // Buscar eventos
    allEvents = await fetchAllEvents();
    filteredEvents = [...allEvents];
    
    // Renderizar eventos
    renderEvents('list');
    
    // Event listeners
    document.getElementById('applyFilters').addEventListener('click', applyFilters);
    document.getElementById('resetFilters').addEventListener('click', resetFilters);
    
    document.getElementById('prevPage').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderEvents(document.querySelector('.view-btn.active').dataset.view);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
    
    document.getElementById('nextPage').addEventListener('click', () => {
        const totalPages = Math.ceil(filteredEvents.length / eventsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderEvents(document.querySelector('.view-btn.active').dataset.view);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
    
    // View toggle
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            renderEvents(this.dataset.view);
        });
    });
}

// Iniciar quando a página carregar
if (document.getElementById('eventsContainer')) {
    document.addEventListener('DOMContentLoaded', init);
}

// FAQ accordion (para página de contactos)
document.addEventListener('DOMContentLoaded', () => {
    const faqQuestions = document.querySelectorAll('.faq-question');
    
    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const answer = question.nextElementSibling;
            const icon = question.querySelector('i');
            
            answer.classList.toggle('active');
            icon.style.transform = answer.classList.contains('active') ? 'rotate(180deg)' : 'rotate(0)';
        });
    });
    
    // Form de contacto
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Mensagem enviada com sucesso! Entraremos em contacto em breve.');
            contactForm.reset();
        });
    }
});