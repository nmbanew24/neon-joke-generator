class AudioVisualizer {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.source = null;
        this.animationId = null;
        this.initialized = false;
        this.canvas = null;
        this.ctx = null;
    }

    initialize() {
        if (!this.initialized) {
            try {
                // Initialize canvas
                this.canvas = document.getElementById('audioVisualizer');
                if (!this.canvas) {
                    console.error('Canvas element not found');
                    return;
                }
                this.ctx = this.canvas.getContext('2d');
                
                // Initialize audio context
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }
                this.analyser = this.audioContext.createAnalyser();
                this.analyser.fftSize = 256;
                this.bufferLength = this.analyser.frequencyBinCount;
                this.dataArray = new Uint8Array(this.bufferLength);
                this.initialized = true;
                
                // Initial resize
                this.resize();
            } catch (error) {
                console.error('Error initializing AudioVisualizer:', error);
            }
        }
    }

    resize() {
        if (this.canvas) {
            this.canvas.width = this.canvas.offsetWidth;
            this.canvas.height = this.canvas.offsetHeight;
        }
    }

    connectSource(audioElement) {
        this.initialize();
        if (this.source) {
            this.source.disconnect();
        }
        this.source = this.audioContext.createMediaElementSource(audioElement);
        this.source.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
    }

    draw() {
        if (!this.initialized) return;
        
        this.animationId = requestAnimationFrame(() => this.draw());
        this.analyser.getByteFrequencyData(this.dataArray);

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const barWidth = (this.canvas.width / this.bufferLength) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < this.bufferLength; i++) {
            barHeight = this.dataArray[i] * 1.5;
            
            const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
            gradient.addColorStop(0, '#ff00ff');
            gradient.addColorStop(1, '#00ffff');
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(x, this.canvas.height - barHeight, barWidth, barHeight);

            x += barWidth + 1;
        }
    }

    start() {
        if (this.initialized && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        this.draw();
    }

    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
}

class AudioPlayer {
    constructor() {
        this.audio = new Audio();
        this.visualizer = new AudioVisualizer();
        this.isPlaying = false;
        this.currentTrack = 0;
        this.db = new MusicDatabase();
        this.tracks = [];

        // Initialize the database and load tracks
        this.initializeDatabase().then(() => {
            this.initializePlayer();
            this.setupEventListeners();
        });
    }

    async initializeDatabase() {
        try {
            await this.db.initDatabase();
            // Add default tracks if database is empty
            const songs = await this.db.getAllSongs();
            if (songs.length === 0) {
                const defaultTracks = [{
                    name: 'Happy Birthday',
                    artist: 'Artist 1',
                    path: './assets/audio/Happy Birthday in the Future (1).mp3'
                },
                {
                    name: 'Heaven Hell',
                    artist: 'Artist 2',
                    path: './assets/audio/hh.mp3'
                },
                {
                    name: 'Realms',
                    artist: 'Artist 3',
                    path: './assets/audio/In the realm of fire and light, I stand .mp3'
                }];

                for (const track of defaultTracks) {
                    await this.db.addSong(track);
                }
            }
            // Load tracks from database
            this.tracks = await this.db.getAllSongs();
        } catch (error) {
            console.error('Error initializing database:', error);
        }
    }

    async addSong(song) {
        try {
            await this.db.addSong(song);
            this.tracks = await this.db.getAllSongs();
            this.updatePlaylist();
        } catch (error) {
            console.error('Error adding song:', error);
        }
    }

    updatePlaylist() {
        const playlist = document.getElementById('playlist');
        playlist.innerHTML = '';
        
        this.tracks.forEach((track, index) => {
            const li = document.createElement('li');
            li.className = 'playlist-item';
            li.innerHTML = `
                <i class="fas fa-music"></i>
                <span>${track.name}</span>
            `;
            li.addEventListener('click', () => {
                this.currentTrack = index;
                this.loadTrack();
                this.togglePlay();
            });
            playlist.appendChild(li);
        });
    }

    initializePlayer() {
        try {
            this.visualizer.connectSource(this.audio);
            this.updateTrackInfo();
            this.setupProgressBar();
            this.loadTrack(); // Load the first track
        } catch (error) {
            console.error('Error initializing player:', error);
        }
    }

    setupEventListeners() {
        // Play/Pause button
        document.getElementById('playPause').addEventListener('click', () => {
            this.togglePlay();
        });

        // Next/Previous buttons
        document.getElementById('nextTrack').addEventListener('click', () => this.nextTrack());
        document.getElementById('prevTrack').addEventListener('click', () => this.prevTrack());

        // Volume control
        document.getElementById('volume').addEventListener('input', (e) => {
            this.audio.volume = e.target.value / 100;
        });

        // Progress bar
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('ended', () => this.nextTrack());

        // Progress bar click
        document.querySelector('.progress-bar').addEventListener('click', (e) => {
            const progressBar = e.currentTarget;
            const clickPosition = (e.pageX - progressBar.offsetLeft) / progressBar.offsetWidth;
            this.audio.currentTime = clickPosition * this.audio.duration;
        });

        // Initialize visualizer on window resize
        window.addEventListener('resize', () => this.visualizer.resize());
        this.visualizer.resize();

        // Playlist item click
        document.querySelectorAll('.playlist-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                this.currentTrack = index;
                this.loadTrack();
                this.togglePlay();
            });
        });
    }

    togglePlay() {
        if (this.isPlaying) {
            this.audio.pause();
        } else {
            // Initialize visualizer on first play
            if (!this.visualizer.initialized) {
                this.visualizer.initialize();
            }
            // Resume AudioContext if it's suspended
            if (this.visualizer.audioContext && this.visualizer.audioContext.state === 'suspended') {
                this.visualizer.audioContext.resume();
            }
            this.audio.play();
        }
        this.isPlaying = !this.isPlaying;
        this.updatePlayButton();
    }

    updatePlayButton() {
        const playButton = document.getElementById('playPause');
        playButton.innerHTML = `<i class="fas fa-${this.isPlaying ? 'pause' : 'play'}" aria-hidden="true"></i>`;
        playButton.setAttribute('aria-label', this.isPlaying ? 'Pause' : 'Play');
    }

    nextTrack() {
        this.currentTrack = (this.currentTrack + 1) % this.tracks.length;
        this.loadTrack();
        if (this.isPlaying) {
            this.togglePlay();
        }
    }

    prevTrack() {
        this.currentTrack = (this.currentTrack - 1 + this.tracks.length) % this.tracks.length;
        this.loadTrack();
        if (this.isPlaying) {
            this.togglePlay();
        }
    }

    loadTrack() {
        try {
            const track = this.tracks[this.currentTrack];
            this.audio.src = track.path;
            
            // Wait for the audio to be loaded before proceeding
            this.audio.addEventListener('loadedmetadata', () => {
                this.updateTrackInfo();
                this.updateProgress();
            });

            this.audio.addEventListener('error', (e) => {
                console.error('Error loading audio:', e);
            });

            // Load the audio
            this.audio.load();
        } catch (error) {
            console.error('Error loading track:', error);
        }
    }

    updateTrackInfo() {
        const track = this.tracks[this.currentTrack];
        document.querySelector('.track-name').textContent = track.name;
        document.querySelector('.track-artist').textContent = track.artist;
    }

    updateProgress() {
        if (this.audio.readyState === 0) return; // Don't update if audio isn't loaded
        
        const progress = document.querySelector('.progress');
        const current = document.querySelector('.current');
        const duration = document.querySelector('.duration');
        
        if (isFinite(this.audio.duration)) {
            const currentTime = this.audio.currentTime;
            const durationTime = this.audio.duration;
            
            const progressPercent = (currentTime / durationTime) * 100;
            progress.style.width = progressPercent + '%';
            
            current.textContent = this.formatTime(currentTime);
            duration.textContent = this.formatTime(durationTime);
        }
    }

    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    setupProgressBar() {
        const progressBar = document.querySelector('.progress-bar');
        progressBar.addEventListener('click', (e) => {
            if (this.audio.readyState === 0) return; // Don't update if audio isn't loaded
            
            const clickPosition = (e.pageX - progressBar.offsetLeft) / progressBar.offsetWidth;
            const newTime = clickPosition * this.audio.duration;
            
            if (isFinite(newTime)) {
                this.audio.currentTime = newTime;
            }
        });
    }
}

// Initialize the audio player when the page loads
window.addEventListener('load', () => {
    const player = new AudioPlayer();
});