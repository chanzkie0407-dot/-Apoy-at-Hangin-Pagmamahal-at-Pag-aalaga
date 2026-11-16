// Global state
let currentSet = null;
let currentIndex = 0;
let roomCode = null;
let isHost = false;
let roomRef = null;

// DOM Elements
const screens = {
    lobby: document.getElementById('lobby-screen'),
    set: document.getElementById('set-screen'),
    question: document.getElementById('question-screen')
};

const elements = {
    createRoomBtn: document.getElementById('create-room-btn'),
    roomCodeDisplay: document.getElementById('room-code-display'),
    roomCodeEl: document.getElementById('room-code'),
    joinCodeInput: document.getElementById('join-code'),
    joinRoomBtn: document.getElementById('join-room-btn'),
    soloModeBtn: document.getElementById('solo-mode-btn'),
    setButtons: document.querySelectorAll('.set-btn'),
    randomBtn: document.getElementById('random-btn'),
    backToLobbyBtn: document.getElementById('back-to-lobby'),
    setLabel: document.getElementById('set-label'),
    qCounter: document.getElementById('q-counter'),
    questionText: document.getElementById('question-text'),
    prevBtn: document.getElementById('prev-btn'),
    nextBtn: document.getElementById('next-btn'),
    changeSetBtn: document.getElementById('change-set-btn'),
    darkToggle: document.getElementById('dark-toggle')
};

// Utility: Generate 6-digit room code
function generateRoomCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Show specific screen
function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenName].classList.add('active');
}

// Load question
function loadQuestion() {
    if (!currentSet) return;
    
    const questions = QUESTIONS[currentSet];
    const setNumber = currentSet.replace('set', '');
    
    elements.setLabel.textContent = `Set ${setNumber}`;
    elements.qCounter.textContent = `${currentIndex + 1} / ${questions.length}`;
    elements.questionText.textContent = questions[currentIndex];
    
    elements.prevBtn.disabled = currentIndex === 0;
    elements.prevBtn.style.opacity = currentIndex === 0 ? '0.4' : '1';
    
    // Sync to Firebase if in a room
    if (roomRef && isHost) {
        roomRef.set({
            currentSet: currentSet,
            currentIndex: currentIndex,
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        });
    }
}

// Go to previous question
function goPrev() {
    if (currentIndex > 0) {
        currentIndex--;
        loadQuestion();
    }
}

// Go to next question
function goNext() {
    const questions = QUESTIONS[currentSet];
    if (currentIndex < questions.length - 1) {
        currentIndex++;
        loadQuestion();
    }
}

// Pick a set
function pickSet(setName) {
    currentSet = setName;
    currentIndex = 0;
    showScreen('question');
    loadQuestion();
}

// Random question from any set
function showRandomQuestion() {
    const allSets = Object.keys(QUESTIONS);
    const randomSet = allSets[Math.floor(Math.random() * allSets.length)];
    const questions = QUESTIONS[randomSet];
    const randomIndex = Math.floor(Math.random() * questions.length);
    
    currentSet = randomSet;
    currentIndex = randomIndex;
    
    showScreen('question');
    elements.setLabel.textContent = '🎲 Random';
    elements.qCounter.textContent = ``;
    elements.questionText.textContent = questions[randomIndex];
    elements.prevBtn.disabled = true;
    elements.nextBtn.disabled = true;
    elements.prevBtn.style.opacity = '0.4';
    elements.nextBtn.style.opacity = '0.4';
}

// Create new room
async function createRoom() {
    roomCode = generateRoomCode();
    isHost = true;
    
    roomRef = db.ref(`rooms/${roomCode}`);
    await roomRef.set({
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        currentSet: null,
        currentIndex: 0
    });
    
    elements.roomCodeEl.textContent = roomCode;
    elements.roomCodeDisplay.classList.remove('hidden');
    
    // Listen for changes (though host controls it)
    roomRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data && data.currentSet && screens.question.classList.contains('active')) {
            // Only update if change comes from elsewhere — host is source
        }
    });
}

// Join existing room
async function joinRoom() {
    const code = elements.joinCodeInput.value.trim();
    if (code.length !== 6) {
        alert('Ilagay ang 6-digit code');
        return;
    }
    
    roomRef = db.ref(`rooms/${code}`);
    const snapshot = await roomRef.once('value');
    
    if (!snapshot.exists()) {
        alert('Hindi nakita ang kwarto. Tingnan ang code at subukan ulit.');
        return;
    }
    
    roomCode = code;
    isHost = false;
    
    // Listen for updates from host
    roomRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data && data.currentSet) {
            currentSet = data.currentSet;
            currentIndex = data.currentIndex;
            showScreen('question');
            loadQuestion();
        }
    });
    
    showScreen('set');
}

// Toggle dark mode
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
}

// === EVENT LISTENERS ===

// Lobby
elements.createRoomBtn.addEventListener('click', createRoom);
elements.joinRoomBtn.addEventListener('click', joinRoom);
elements.soloModeBtn.addEventListener('click', () => {
    roomCode = null;
    roomRef = null;
    showScreen('set');
});

// Set selection
elements.setButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const setNum = btn.dataset.set;
        pickSet(`set${setNum}`);
    });
});

elements.randomBtn.addEventListener('click', showRandomQuestion);
elements.backToLobbyBtn.addEventListener('click', () => showScreen('lobby'));

// Question navigation
elements.prevBtn.addEventListener('click', goPrev);
elements.nextBtn.addEventListener('click', goNext);
elements.changeSetBtn.addEventListener('click', () => showScreen('set'));
elements.darkToggle.addEventListener('click', toggleDarkMode);

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    if (!screens.question.classList.contains('active')) return;
    if (e.key === 'ArrowLeft') goPrev();
    if (e.key === 'ArrowRight') goNext();
});
