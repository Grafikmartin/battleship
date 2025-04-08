import React, { useState, useEffect } from 'react';
// Material Design Icons nutzen
import 'material-symbols';

const SoundToggle: React.FC = () => {
  const [isMuted, setIsMuted] = useState(() => {
    // Initial-Status aus localStorage lesen
    try {
      const savedState = localStorage.getItem('soundEnabled');
      return savedState === 'false'; // Wenn 'false', dann ist Sound deaktiviert
    } catch (e) {
      return false; // Standard: Sound ist aktiviert
    }
  });
  
  const toggleSound = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    
    try {
      localStorage.setItem('soundEnabled', (!newMuted).toString());
      
      // Sende ein Event an das Dokument, damit andere Komponenten reagieren können
      document.dispatchEvent(new CustomEvent('soundSettingChanged', { 
        detail: { isMuted: newMuted } 
      }));
      
      console.log("Sound changed to:", newMuted ? "muted" : "unmuted");
    } catch (error) {
      console.error('Error saving sound setting:', error);
    }
  };

  // Return fehlte in deinem Code:
  return (
    <button 
      className="sound-toggle"
      onClick={toggleSound}
      title={isMuted ? "Ton einschalten" : "Ton ausschalten"}
    >
      <span className="material-symbols-outlined">
        {isMuted ? 'volume_off' : 'volume_up'}
      </span>
    </button>
  );
};

export default SoundToggle;