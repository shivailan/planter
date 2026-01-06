// --- ÉTAT GLOBAL ---
const state = {
    db: JSON.parse(localStorage.getItem('gf_final_db')) || {},
    selectedDate: new Date().toISOString().split('T')[0],
    daysShort: ['LUN','MAR','MER','JEU','VEN','SAM','DIM'],
    selectedCategory: 'all',
    categories: {
        'travail': { name: 'Travail', icon: '💼', color: '#3B82F6' },
        'personnel': { name: 'Personnel', icon: '👤', color: '#8B5CF6' },
        'sante': { name: 'Santé', icon: '💚', color: '#10B981' },
        'apprentissage': { name: 'Apprentissage', icon: '📚', color: '#F59E0B' }
    },
    priorities: {
        'haute': { name: 'Haute', color: '#EF4444', bg: '#FEE2E2' },
        'moyenne': { name: 'Moyenne', color: '#F59E0B', bg: '#FEF3C7' },
        'basse': { name: 'Basse', color: '#6B7280', bg: '#F3F4F6' }
    }
};

// --- NAVIGATION ---
const navigation = {
    goTo(id) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active-page'));
        document.getElementById('page-' + id).classList.add('active-page');
        
        document.querySelectorAll('.nav-link').forEach((l, i) => {
            l.classList.remove('active');
            if(id === 'home' && i === 0) l.classList.add('active');
            if(id === 'focus' && i === 1) l.classList.add('active');
            if(id === 'weekly' && i === 3) l.classList.add('active');
        });

        if(id === 'focus') ui.renderFocus();
        if(id === 'weekly') ui.renderWeekly();
    }
};

// --- LOGIQUE APPLICATIVE ---
const app = {
    save() {
        localStorage.setItem('gf_final_db', JSON.stringify(state.db));
    },

    addObj() {
        const title = document.getElementById('t-title').value;
        const dIdx = parseInt(document.getElementById('t-day').value);
        const hour = parseInt(document.getElementById('t-hour').value);
        const priority = document.getElementById('t-priority').value;
        const category = document.getElementById('t-category').value;
        
        if(!title) return;

        const start = new Date();
        start.setDate(start.getDate() - (start.getDay() === 0 ? 6 : start.getDay() - 1));
        const target = new Date(start);
        target.setDate(start.getDate() + dIdx);
        const key = target.toISOString().split('T')[0];

        if(!state.db[key]) state.db[key] = [];
        state.db[key].push({ title, hour, done: false, priority, category });
        
        // Réinitialiser le formulaire
        document.getElementById('t-title').value = '';
        document.getElementById('t-priority').value = 'moyenne';
        document.getElementById('t-category').value = 'travail';
        
        this.save();
        ui.closeM();
        navigation.goTo('weekly');
    },

    toggleTask(date, index) {
        state.db[date][index].done = !state.db[date][index].done;
        this.save();
        ui.renderFocus();
    }
};

// --- INTERFACE (UI) ---
const ui = {
    openM() { document.getElementById('modal').style.display = 'flex'; },
    closeM() { document.getElementById('modal').style.display = 'none'; },

    renderFocus() {
        const picker = document.getElementById('focus-picker');
        const list = document.getElementById('focus-list');
        picker.innerHTML = ''; list.innerHTML = '';
        
        const start = new Date();
        start.setDate(new Date().getDate() - (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1));

        for(let i=0; i<7; i++) {
            const d = new Date(start); d.setDate(start.getDate() + i);
            const key = d.toISOString().split('T')[0];
            picker.innerHTML += `
                <div class="date-item ${key === state.selectedDate ? 'active' : ''}" 
                     onclick="state.selectedDate='${key}'; ui.renderFocus()">
                    <span>${state.daysShort[i]}</span><b>${d.getDate()}</b>
                </div>`;
        }

        let allTasks = state.db[state.selectedDate] || [];
        
        // Ajouter l'index original à chaque tâche
        let tasksWithIndex = allTasks.map((t, idx) => ({ ...t, _originalIndex: idx }));
        
        // Filtrer par catégorie
        if(state.selectedCategory !== 'all') {
            tasksWithIndex = tasksWithIndex.filter(t => t.category === state.selectedCategory);
        }

        // Trier par priorité (haute > moyenne > basse)
        const priorityOrder = { 'haute': 3, 'moyenne': 2, 'basse': 1 };
        tasksWithIndex.sort((a, b) => {
            const aPriority = priorityOrder[a.priority || 'moyenne'];
            const bPriority = priorityOrder[b.priority || 'moyenne'];
            return bPriority - aPriority;
        });

        tasksWithIndex.forEach((t) => {
            const priority = t.priority || 'moyenne';
            const category = t.category || 'travail';
            const priorityInfo = state.priorities[priority];
            const categoryInfo = state.categories[category];
            
            list.innerHTML += `
                <div class="task-item ${t.done ? 'done' : ''}" onclick="app.toggleTask('${state.selectedDate}', ${t._originalIndex})">
                    <div class="task-left">
                        <div class="checkbox">${t.done ? '✓' : ''}</div>
                        <div class="task-content">
                            <div class="task-text">${t.title}</div>
                            <div class="task-meta">
                                <span class="priority-badge" style="background: ${priorityInfo.bg}; color: ${priorityInfo.color};">
                                    ${priorityInfo.name}
                                </span>
                                <span class="category-badge" style="color: ${categoryInfo.color};">
                                    ${categoryInfo.icon} ${categoryInfo.name}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="priority-indicator" style="background: ${priorityInfo.color};"></div>
                </div>`;
        });
        this.updateProgress();
    },

    filterByCategory(category) {
        state.selectedCategory = category;
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if(btn.dataset.category === category) btn.classList.add('active');
        });
        this.renderFocus();
    },

    updateProgress() {
        const t = state.db[state.selectedDate] || [];
        const d = t.filter(x => x.done).length;
        const pc = t.length ? Math.round((d / t.length) * 100) : 0;
        document.getElementById('p-text').innerText = pc + '%';
        document.getElementById('p-bar').style.strokeDashoffset = 282.7 - (282.7 * pc / 100);
    },

    renderWeekly() {
        const hr = document.getElementById('header-cont');
        const dc = document.getElementById('days-cont');
        const hc = document.getElementById('hours-cont');
        hr.innerHTML = dc.innerHTML = hc.innerHTML = '';

        const start = new Date();
        start.setDate(new Date().getDate() - (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1));

        for(let i=0; i<7; i++) {
            const d = new Date(start); d.setDate(start.getDate() + i);
            const key = d.toISOString().split('T')[0];
            hr.innerHTML += `<div class="day-box"><span>${state.daysShort[i]}</span><b>${d.getDate()}</b></div>`;
            
            const col = document.createElement('div');
            col.className = 'day-column';
            const tasks = (state.db[key] || []).sort((a, b) => {
                const priorityOrder = { 'haute': 3, 'moyenne': 2, 'basse': 1 };
                const aPriority = priorityOrder[a.priority || 'moyenne'];
                const bPriority = priorityOrder[b.priority || 'moyenne'];
                return bPriority - aPriority;
            });
            
            tasks.forEach(e => {
                const priority = e.priority || 'moyenne';
                const category = e.category || 'travail';
                const priorityInfo = state.priorities[priority];
                const categoryInfo = state.categories[category];
                const borderColor = priorityInfo.color;
                
                col.innerHTML += `
                    <div class="event-node" 
                         style="top:${e.hour * 90 + 10}px; height:70px; border-left: 4px solid ${borderColor};">
                        <div class="event-title">${e.title}</div>
                        <div class="event-tags">
                            <span class="event-priority" style="background: ${priorityInfo.bg}; color: ${priorityInfo.color};">
                                ${priorityInfo.name}
                            </span>
                            <span class="event-category" style="color: ${categoryInfo.color};">
                                ${categoryInfo.icon}
                            </span>
                        </div>
                    </div>`;
            });
            dc.appendChild(col);
        }
        for(let i=0; i<24; i++) hc.innerHTML += `<div class="hour-mark">${i}:00</div>`;

        const gV = document.getElementById('grid-view');
        const hV = document.getElementById('header-view');
        gV.onscroll = () => hV.scrollLeft = gV.scrollLeft;
    }
};

// --- INITIALISATION ---
window.onload = () => {
    // Remplir les heures du modal
    const hSelect = document.getElementById('t-hour');
    for(let i=0; i<24; i++) {
        hSelect.innerHTML += `<option value="${i}">${i}:00</option>`;
    }
    ui.renderWeekly();
};