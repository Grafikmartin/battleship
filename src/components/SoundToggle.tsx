import React, { useState } from 'react';
import { FaVolumeUp, FaVolumeMute } from 'react-icons/fa';

interface SoundToggleProps {}

const SoundToggle: React.FC<SoundToggleProps> = () => {
  const [isMuted, setIsMuted] = useState(false);
  
  const toggleSound = () => {
    const newIsMuted = !isMuted;
    setIsMuted(newIsMuted);
    
    // Speichere Einstellung in localStorage
    try {
      localStorage.setItem('soundEnabled', (!newIsMuted).toString());
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  return (
    <button 
      className="sound-toggle"
      onClick={toggleSound}
      title={isMuted ? "Ton einschalten" : "Ton ausschalten"}
    >
      {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
    </button>
  );
};

export default SoundToggle;