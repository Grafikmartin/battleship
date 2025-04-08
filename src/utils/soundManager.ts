class SoundManager {
  private static isSoundEnabled: boolean = true;

  static init() {
    try {
      const savedState = localStorage.getItem('soundEnabled');
      if (savedState !== null) {
        this.isSoundEnabled = savedState === 'true';
      }
    } catch (error) {
      console.error('Error accessing localStorage:', error);
    }
  }

  static isMuted(): boolean {
    return !this.isSoundEnabled;
  }

  static toggleSound() {
    this.isSoundEnabled = !this.isSoundEnabled;
    try {
      localStorage.setItem('soundEnabled', this.isSoundEnabled.toString());
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
    return this.isSoundEnabled;
  }

  static setMuted(muted: boolean) {
    this.isSoundEnabled = !muted;
    try {
      localStorage.setItem('soundEnabled', this.isSoundEnabled.toString());
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  static playSound(sound: HTMLAudioElement): Promise<void> {
    return new Promise((resolve) => {
      try {
        if (!this.isSoundEnabled) {
          resolve();
          return;
        }
        
        const clone = sound.cloneNode() as HTMLAudioElement;
        clone.play()
          .then(() => {
            clone.onended = () => resolve();
          })
          .catch(error => {
            console.error('Error playing sound:', error);
            resolve();
          });
      } catch (error) {
        console.error('Error setting up sound:', error);
        resolve();
      }
    });
  }
}

// Initialisiere Sound-Status beim Import
SoundManager.init();

export default SoundManager;