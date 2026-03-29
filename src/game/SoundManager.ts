export class SoundManager {
    private sounds: { [key: string]: HTMLAudioElement } = {};

    constructor() {
        // Placeholder URLs - user needs to provide actual files
        this.sounds['move'] = new Audio('/sounds/move.mp3');
        this.sounds['shoot'] = new Audio('/sounds/shoot.mp3');
        this.sounds['explosion'] = new Audio('/sounds/explosion.mp3');
        this.sounds['pickup'] = new Audio('/sounds/pickup.mp3');
    }

    play(soundName: string) {
        if (this.sounds[soundName]) {
            this.sounds[soundName].currentTime = 0;
            this.sounds[soundName].play().catch(e => console.error("Error playing sound:", e));
        }
    }
}
