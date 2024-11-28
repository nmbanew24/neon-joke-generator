class MusicDatabase {
    constructor() {
        this.dbName = 'MusicPlayerDB';
        this.dbVersion = 1;
        this.db = null;
        this.initDatabase();
    }

    initDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = (event) => {
                console.error('Database error:', event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('Database opened successfully');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create songs store
                if (!db.objectStoreNames.contains('songs')) {
                    const songStore = db.createObjectStore('songs', { keyPath: 'id', autoIncrement: true });
                    songStore.createIndex('name', 'name', { unique: false });
                    songStore.createIndex('artist', 'artist', { unique: false });
                    songStore.createIndex('path', 'path', { unique: true });
                }

                // Create playlists store
                if (!db.objectStoreNames.contains('playlists')) {
                    const playlistStore = db.createObjectStore('playlists', { keyPath: 'id', autoIncrement: true });
                    playlistStore.createIndex('name', 'name', { unique: true });
                }
            };
        });
    }

    async addSong(song) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['songs'], 'readwrite');
            const store = transaction.objectStore('songs');
            const request = store.add(song);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllSongs() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['songs'], 'readonly');
            const store = transaction.objectStore('songs');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async createPlaylist(name) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['playlists'], 'readwrite');
            const store = transaction.objectStore('playlists');
            const request = store.add({ name, songs: [] });

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async addSongToPlaylist(playlistId, songId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['playlists'], 'readwrite');
            const store = transaction.objectStore('playlists');
            const request = store.get(playlistId);

            request.onsuccess = () => {
                const playlist = request.result;
                if (!playlist.songs.includes(songId)) {
                    playlist.songs.push(songId);
                    store.put(playlist).onsuccess = () => resolve(true);
                } else {
                    resolve(false);
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    async getPlaylistSongs(playlistId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['playlists', 'songs'], 'readonly');
            const playlistStore = transaction.objectStore('playlists');
            const songStore = transaction.objectStore('songs');

            const playlistRequest = playlistStore.get(playlistId);
            playlistRequest.onsuccess = async () => {
                const playlist = playlistRequest.result;
                const songs = await Promise.all(
                    playlist.songs.map(songId => 
                        new Promise((resolve) => {
                            songStore.get(songId).onsuccess = (event) => resolve(event.target.result);
                        })
                    )
                );
                resolve(songs);
            };
            playlistRequest.onerror = () => reject(playlistRequest.error);
        });
    }
}
