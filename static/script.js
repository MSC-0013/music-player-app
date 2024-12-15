// DOM Elements
const audioPlayer = document.getElementById('audioPlayer');
const playPauseButton = document.getElementById('playPauseButton');
const prevButton = document.getElementById('prevButton');
const nextButton = document.getElementById('nextButton');
const shuffleButton = document.getElementById('shuffleButton');
const repeatButton = document.getElementById('repeatButton');
const volumeButton = document.getElementById('volumeButton');
const volumeSlider = document.getElementById('volumeSlider');
const progressBar = document.querySelector('.progress-bar');
const progress = document.getElementById('progress');
const currentTimeDisplay = document.getElementById('currentTime');
const durationDisplay = document.getElementById('duration');
const songList = document.getElementById('songList');
const currentArt = document.getElementById('currentArt');
const currentSong = document.getElementById('currentSong');
const currentArtist = document.getElementById('currentArtist');
const searchInput = document.getElementById('searchInput');
const folderInput = document.getElementById('folderInput');
const favoriteButton = document.getElementById('favoriteButton');
const sidebarButtons = document.querySelectorAll('.sidebar-menu li');
const addPlaylistBtn = document.querySelector('.add-playlist-btn');

// State
let songs = [];
let currentSongIndex = 0;
let isPlaying = false;
let isShuffle = false;
let repeatMode = 'none'; // none, one, all
let volume = 1;
let favorites = new Set();
let recentlyPlayed = new Set();
let recentlyAdded = [];
let playlists = new Map();
let currentView = 'all-music'; // all-music, recently-added, favorites, recently-played

// Initialize
function init() {
    loadSettings();
    setupEventListeners();
    loadPlaylists();
    updateRepeatButtonUI();
}

// Load saved settings
function loadSettings() {
    const savedVolume = localStorage.getItem('volume');
    if (savedVolume) {
        volume = parseFloat(savedVolume);
        volumeSlider.value = volume * 100;
        audioPlayer.volume = volume;
    }

    const savedFavorites = localStorage.getItem('favorites');
    if (savedFavorites) {
        favorites = new Set(JSON.parse(savedFavorites));
    }

    const savedRecentlyPlayed = localStorage.getItem('recentlyPlayed');
    if (savedRecentlyPlayed) {
        recentlyPlayed = new Set(JSON.parse(savedRecentlyPlayed));
    }

    const savedRepeatMode = localStorage.getItem('repeatMode');
    if (savedRepeatMode) {
        repeatMode = savedRepeatMode;
    }
}

// Update repeat button UI
function updateRepeatButtonUI() {
    const icons = {
        'none': '<i class="fas fa-repeat"></i>',
        'one': '<i class="fas fa-repeat-1"></i>',
        'all': '<i class="fas fa-repeat active"></i>'
    };
    
    repeatButton.innerHTML = icons[repeatMode];
    repeatButton.classList.toggle('active', repeatMode !== 'none');
    
    // Update tooltip
    const tooltips = {
        'none': 'Enable repeat',
        'one': 'Repeat one',
        'all': 'Repeat all'
    };
    repeatButton.title = tooltips[repeatMode];
}

// Event Listeners
function setupEventListeners() {
    // Playback Controls
    playPauseButton.addEventListener('click', togglePlayPause);
    prevButton.addEventListener('click', playPrevious);
    nextButton.addEventListener('click', playNext);
    shuffleButton.addEventListener('click', toggleShuffle);
    
    // Repeat button
    repeatButton.addEventListener('click', () => {
        toggleRepeat();
        // Add visual feedback
        repeatButton.classList.add('clicked');
        setTimeout(() => repeatButton.classList.remove('clicked'), 200);
    });
    
    // Volume Controls
    volumeButton.addEventListener('click', toggleMute);
    volumeSlider.addEventListener('input', handleVolumeChange);
    
    // Progress Bar
    progressBar.addEventListener('click', seek);
    audioPlayer.addEventListener('timeupdate', updateProgress);
    audioPlayer.addEventListener('loadedmetadata', updateDuration);
    audioPlayer.addEventListener('ended', handleSongEnd);
    
    // File Input
    folderInput.addEventListener('change', handleFolderSelect);
    
    // Search
    searchInput.addEventListener('input', handleSearch);
    
    // Favorites
    favoriteButton.addEventListener('click', toggleFavorite);
    
    // Window Controls
    document.querySelector('.minimize').addEventListener('click', () => {
        window.api.minimize();
    });
    
    document.querySelector('.maximize').addEventListener('click', () => {
        window.api.maximize();
    });
    
    document.querySelector('.close').addEventListener('click', () => {
        window.api.close();
    });
    
    // Keyboard Shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Sidebar Navigation
    sidebarButtons.forEach(button => {
        button.addEventListener('click', () => {
            sidebarButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            const view = button.textContent.toLowerCase().replace(/\s+/g, '-');
            updateView(view);
        });
    });

    // Add Playlist
    addPlaylistBtn.addEventListener('click', createNewPlaylist);
}

// View Management
function updateView(view) {
    currentView = view;
    let songsToShow = [];

    switch(view) {
        case 'all-music':
            songsToShow = songs;
            break;
        case 'recently-added':
            songsToShow = recentlyAdded;
            break;
        case 'favorites':
            songsToShow = songs.filter(song => favorites.has(song.path));
            break;
        case 'recently-played':
            songsToShow = songs.filter(song => recentlyPlayed.has(song.path));
            break;
        default:
            if (playlists.has(view)) {
                songsToShow = playlists.get(view);
            }
    }

    updateSongListUI(songsToShow);
}

// Playlist Management
function createNewPlaylist() {
    const name = prompt('Enter playlist name:');
    if (name && !playlists.has(name)) {
        playlists.set(name, []);
        savePlaylists();
        updatePlaylistsUI();
    }
}

function updatePlaylistsUI() {
    const playlistMenu = document.getElementById('playlistMenu');
    playlistMenu.innerHTML = '';

    playlists.forEach((songs, name) => {
        const li = document.createElement('li');
        li.innerHTML = `<i class="fas fa-list"></i>${name}`;
        li.addEventListener('click', () => updateView(name));
        playlistMenu.appendChild(li);
    });
}

function savePlaylists() {
    localStorage.setItem('playlists', JSON.stringify(Array.from(playlists.entries())));
}

// Playback Functions
function togglePlayPause() {
    if (songs.length === 0) return;
    
    if (isPlaying) {
        audioPlayer.pause();
        playPauseButton.innerHTML = '<i class="fas fa-play"></i>';
    } else {
        audioPlayer.play();
        playPauseButton.innerHTML = '<i class="fas fa-pause"></i>';
    }
    isPlaying = !isPlaying;
}

function playPrevious() {
    if (songs.length === 0) return;
    
    if (audioPlayer.currentTime > 3) {
        audioPlayer.currentTime = 0;
        return;
    }
    
    currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
    loadAndPlaySong(currentSongIndex);
}

function playNext() {
    if (songs.length === 0) return;
    
    if (isShuffle) {
        currentSongIndex = Math.floor(Math.random() * songs.length);
    } else {
        currentSongIndex = (currentSongIndex + 1) % songs.length;
    }
    loadAndPlaySong(currentSongIndex);
}

function loadAndPlaySong(index) {
    const song = songs[index];
    if (!song) return;

    audioPlayer.src = song.path;
    audioPlayer.play();
    isPlaying = true;
    playPauseButton.innerHTML = '<i class="fas fa-pause"></i>';
    
    // Update mini player info
    currentSong.textContent = song.title || 'Unknown Title';
    currentSong.title = song.title || 'Unknown Title'; // Add tooltip for long names
    currentArt.src = song.artwork || 'default-album-art.png';
    
    updateSongListUI();
    updateRecentlyPlayed(song);
}

// Volume Controls
function handleVolumeChange(e) {
    volume = e.target.value / 100;
    audioPlayer.volume = volume;
    updateVolumeIcon();
    localStorage.setItem('volume', volume.toString());
}

function toggleMute() {
    if (audioPlayer.volume > 0) {
        audioPlayer.volume = 0;
        volumeSlider.value = 0;
    } else {
        audioPlayer.volume = volume;
        volumeSlider.value = volume * 100;
    }
    updateVolumeIcon();
}

function updateVolumeIcon() {
    const vol = audioPlayer.volume;
    let icon = 'fa-volume-up';
    if (vol === 0) icon = 'fa-volume-mute';
    else if (vol < 0.5) icon = 'fa-volume-down';
    volumeButton.innerHTML = `<i class="fas ${icon}"></i>`;
}

// Progress Bar
function updateProgress() {
    const percent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    progress.style.width = `${percent}%`;
    currentTimeDisplay.textContent = formatTime(audioPlayer.currentTime);
}

function updateDuration() {
    durationDisplay.textContent = formatTime(audioPlayer.duration);
}

function seek(e) {
    const rect = progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audioPlayer.currentTime = percent * audioPlayer.duration;
}

// File Handling
async function handleFolderSelect(e) {
    const files = Array.from(e.target.files).filter(file => file.type.startsWith('audio/'));
    if (files.length === 0) return;

    songs = [];
    for (const file of files) {
        try {
            const duration = await getSongDuration(file);
            const metadata = await getMetadata(file);
            
            songs.push({
                title: metadata.title || file.name.replace(/\.[^/.]+$/, ''),
                artist: metadata.artist || 'Unknown Artist',
                album: metadata.album || 'Unknown Album',
                artwork: metadata.artwork || 'default-album-art.png',
                duration: duration,
                path: URL.createObjectURL(file)
            });
        } catch (error) {
            console.error('Error processing file:', file.name, error);
        }
    }

    // Sort songs alphabetically by title
    songs.sort((a, b) => a.title.localeCompare(b.title));
    
    currentSongIndex = 0;
    updateSongListUI();
    
    if (songs.length > 0) {
        loadAndPlaySong(0);
    }
}

// Get song duration
async function getSongDuration(file) {
    return new Promise((resolve) => {
        const audio = new Audio();
        audio.addEventListener('loadedmetadata', () => {
            resolve(audio.duration);
        });
        audio.addEventListener('error', () => {
            console.warn('Error loading audio file:', file.name);
            resolve(0);
        });
        audio.src = URL.createObjectURL(file);
    });
}

// Format time in seconds to MM:SS
function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// UI Updates
function updateSongListUI(songsToShow = songs) {
    if (!songsToShow || songsToShow.length === 0) {
        songList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-music"></i>
                <p>No music files loaded</p>
                <p>Click "Add Music" to load your songs</p>
            </div>
        `;
        return;
    }

    songList.innerHTML = songsToShow.map((song, index) => `
        <div class="song-item ${song === songs[currentSongIndex] ? 'active' : ''}" 
             onclick="window.player.playSongAtIndex(${songs.indexOf(song)})">
            <div class="song-title">
                <i class="fas fa-music"></i>
                <div class="song-info">
                    <div class="song-name">${song.title || 'Unknown Title'}</div>
                </div>
            </div>
            <div class="song-duration">${formatTime(song.duration)}</div>
        </div>
    `).join('');
}

// Add this to make the song click handler accessible
window.player = {
    playSongAtIndex: function(index) {
        if (index >= 0 && index < songs.length) {
            currentSongIndex = index;
            loadAndPlaySong(index);
        }
    }
};

// Metadata Extraction
async function getMetadata(file) {
    return new Promise((resolve, reject) => {
        jsmediatags.read(file, {
            onSuccess: (tag) => {
                let artwork = null;
                if (tag.tags.picture) {
                    const { data, format } = tag.tags.picture;
                    const base64 = data.reduce((acc, byte) => acc + String.fromCharCode(byte), '');
                    artwork = `data:${format};base64,${btoa(base64)}`;
                }
                
                resolve({
                    title: tag.tags.title,
                    artist: tag.tags.artist,
                    album: tag.tags.album,
                    artwork
                });
            },
            onError: (error) => {
                console.warn('Metadata extraction failed:', error);
                resolve({});
            }
        });
    });
}

// Search
function handleSearch(e) {
    const query = e.target.value.toLowerCase();
    const songItems = songList.querySelectorAll('.song-item');
    
    songItems.forEach((item, index) => {
        const song = songs[index];
        const matchesSearch = 
            song.title.toLowerCase().includes(query) ||
            song.artist.toLowerCase().includes(query) ||
            song.album.toLowerCase().includes(query);
            
        item.style.display = matchesSearch ? 'grid' : 'none';
    });
}

// Favorites
function toggleFavorite() {
    const currentSong = songs[currentSongIndex];
    if (favorites.has(currentSong.path)) {
        favorites.delete(currentSong.path);
        favoriteButton.innerHTML = '<i class="far fa-heart"></i>';
    } else {
        favorites.add(currentSong.path);
        favoriteButton.innerHTML = '<i class="fas fa-heart"></i>';
    }
    localStorage.setItem('favorites', JSON.stringify(Array.from(favorites)));
    updateSongListUI();
}

// Playback Controls
function toggleShuffle() {
    isShuffle = !isShuffle;
    shuffleButton.classList.toggle('active');
}

function toggleRepeat() {
    const modes = ['none', 'one', 'all'];
    const currentIndex = modes.indexOf(repeatMode);
    repeatMode = modes[(currentIndex + 1) % modes.length];
    
    // Save to localStorage
    localStorage.setItem('repeatMode', repeatMode);
    
    // Update UI
    updateRepeatButtonUI();
}

function handleSongEnd() {
    switch(repeatMode) {
        case 'one':
            audioPlayer.currentTime = 0;
            audioPlayer.play();
            break;
        case 'all':
            if (currentSongIndex === songs.length - 1) {
                currentSongIndex = 0;
            } else {
                currentSongIndex++;
            }
            loadAndPlaySong(currentSongIndex);
            break;
        case 'none':
            if (currentSongIndex < songs.length - 1) {
                playNext();
            } else {
                isPlaying = false;
                playPauseButton.innerHTML = '<i class="fas fa-play"></i>';
                audioPlayer.currentTime = 0;
                updateSongListUI();
            }
            break;
    }
}

// Keyboard Shortcuts
function handleKeyboardShortcuts(e) {
    if (e.target.tagName === 'INPUT') return;
    
    switch(e.code) {
        case 'Space':
            e.preventDefault();
            togglePlayPause();
            break;
        case 'ArrowLeft':
            if (e.ctrlKey) playPrevious();
            else audioPlayer.currentTime -= 5;
            break;
        case 'ArrowRight':
            if (e.ctrlKey) playNext();
            else audioPlayer.currentTime += 5;
            break;
        case 'ArrowUp':
            e.preventDefault();
            volumeSlider.value = Math.min(100, parseInt(volumeSlider.value) + 5);
            handleVolumeChange({ target: volumeSlider });
            break;
        case 'ArrowDown':
            e.preventDefault();
            volumeSlider.value = Math.max(0, parseInt(volumeSlider.value) - 5);
            handleVolumeChange({ target: volumeSlider });
            break;
    }
}

// Utility Functions
function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Update recently played
function updateRecentlyPlayed(song) {
    recentlyPlayed.add(song.path);
    localStorage.setItem('recentlyPlayed', JSON.stringify(Array.from(recentlyPlayed)));
}

// Initialize the app
init();

// Add some CSS classes
const style = document.createElement('style');
style.textContent = `
    .loading {
        padding: 20px;
        text-align: center;
        color: var(--text-secondary);
    }
    
    .error {
        padding: 20px;
        text-align: center;
        color: #ff4444;
    }
    
    .empty-state {
        padding: 40px;
        text-align: center;
        color: var(--text-secondary);
    }
    
    .empty-state i {
        font-size: 48px;
        margin-bottom: 16px;
    }
    
    .empty-state p {
        margin: 8px 0;
    }
    
    .song-info {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }
    
    .song-name {
        color: var(--text-primary);
    }
    
    .song-artist {
        color: var(--text-secondary);
        font-size: 0.8rem;
    }
`;
document.head.appendChild(style);
// Fetch songs from the backend and display them
async function loadSongs() {
    try {
        const response = await fetch('/api/songs');
        const songs = await response.json();

        const songList = document.getElementById('songList'); // Update the correct DOM ID
        songList.innerHTML = ''; // Clear any existing content

        // Add each song to the song list
        songs.forEach((song, index) => {
            const songItem = document.createElement('div');
            songItem.className = 'song-item';
            songItem.innerHTML = `
                <div class="song-title">
                    <i class="fas fa-music"></i>
                    ${song.title}
                </div>
                <div class="song-duration">--:--</div>
            `;

            // Add click event to play the song
            songItem.onclick = () => playSong(song.path, song.title);
            songList.appendChild(songItem);
        });
    } catch (error) {
        console.error('Error loading songs:', error);
    }
}

// Play the selected song
function playSong(path, title) {
    const audioPlayer = document.getElementById('audioPlayer');
    const currentSong = document.getElementById('currentSong');

    audioPlayer.src = path;
    audioPlayer.play();
    currentSong.textContent = title;
}

// Load songs on page load
loadSongs();
