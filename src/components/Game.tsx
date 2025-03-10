import React, { useState, useEffect, useCallback, useRef } from 'react';

// Constants
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const GRAVITY = 0.7;
const JUMP_FORCE = -10;
const MOVE_SPEED = 5;
const PLAYER_SIZE = 45; 
const PLATFORM_HEIGHT = 20;
const MAX_JUMP_COUNT = 2;
const COIN_SIZE = 20;
const POWERUP_SIZE = 30;
const COIN_SPAWN_CHANCE = 0.2; // 20% chance per platform
const POWERUP_SPAWN_CHANCE = 0; // 5% chance per platform
const SPECIAL_PLATFORM_CHANCE = 0.2; // 20% chance for special platforms

// Outside component variables
let gameSpeed = 1.0;

// Define character skins
const CHARACTER_SKINS = {
  pink: { color: '#FFB6C1', image: '/pink.png' },
  blue: { color: '#87CEFA', image: '/blue.png' },
  green: { color: '#90EE90', image: '/green.png' },
  purple: { color: '#DDA0DD', image: '/purple.png' },
  orange: { color: '#FFA500', image: '/orange.png' },
};

const GOLDEN_COIN_SMALL = () => (
  <div className="inline-flex w-6 h-6 relative">
    <div className="absolute inset-0 rounded-full" 
      style={{
        background: 'linear-gradient(45deg, #FFC107, #FFD54F)',
        boxShadow: '0 0 10px rgba(255,215,0,0.5), inset 0 0 5px rgba(255,255,255,0.3)',
        border: '2px solid rgba(255,255,255,0.8)',
        animation: 'spin 4s linear infinite'
      }}
    />
  </div>
);

const GOLDEN_COIN_BIG = () => (
  <div className="inline-flex w-7 h-7 relative">
    <div className="absolute inset-0 rounded-full" 
      style={{
        background: 'linear-gradient(45deg, #FFC107, #FFD54F)',
        boxShadow: '0 0 10px rgba(255,215,0,0.5), inset 0 0 5px rgba(255,255,255,0.3)',
        border: '2px solid rgba(255,255,255,0.8)',
        animation: 'spin 4s linear infinite'
      }}
    />
  </div>
);

// Add power-up asset mapping
const POWERUP_IMAGES = {
  jump_boost: '/jump-boost.png',
  slow_motion: '/slow-motion.png',
  // coin_magnet: '/coin-magnet.jpg',
  shield: '/shield.png',
};

const chosenBackground = '/retro-background.jpg';
const AUDIO_ASSETS = {
  // Sound effects
  jump: '/jump.mp3',
  coin: '/coin.mp3',
  powerUp: '/power-up.mp3',
};
const menuMusic = new Audio('/background-music.mp3');
const gameMusic = new Audio('/game-music.mp3');
menuMusic.loop = true;
gameMusic.loop = true;

// Audio cache to prevent reloading
const audioCache: Record<string, HTMLAudioElement> = {};
// Improved sound effect function
const playSoundEffect = (type: string) => {
  if (!audioCache[type]) {
    const path = AUDIO_ASSETS[type as keyof typeof AUDIO_ASSETS];
    if (path) {
      audioCache[type] = new Audio(path);
    } else {
      console.log(`Sound not found: ${type}`);
      return;
    }
  }
  
  try {
    if (type === 'coin') {
      audioCache[type].volume = 0.2; // lower coin volume
    }
    audioCache[type].currentTime = 0; // Reset to start
    audioCache[type].play().catch(err => console.log('Audio play error:', err));
  } catch (error) {
    console.log(`Error playing sound ${type}:`, error);
  }
};


interface Platform {
  x: number;
  y: number;
  width: number;
  type?: 'normal' | 'moving' | 'disappearing'; // Adding platform types
  direction?: number; // For moving platforms
  visible?: boolean; // For disappearing platforms
  timer?: number; // For disappearing platforms
  startX?: number; // For moving platforms
  moveDistance?: number; // For moving platforms
}

interface Coin {
  x: number;
  y: number;
  collected: boolean;
  value: number;
}

interface PowerUp {
  x: number;
  y: number;
  type: 'jump_boost' | 'slow_motion' | 'shield';
  collected: boolean;
  duration: number; // In seconds
}

interface Challenge {
  id: string;
  description: string;
  target: number;
  progress: number;
  completed: boolean;
  reward: number;
  claimed?: boolean; 
}

interface Player {
  x: number;
  y: number;
  velocityY: number;
  velocityX: number;
  isJumping: boolean;
  jumpCount: number;
  rotation: number;
  color: string; // For customization
  activeEffects: {
    jumpBoost: number; // Timer in frames
    slowMotion: number; // Timer in frames
    shield: boolean;
  };
}


export default function Game() {
  
  // Existing states
  const [gameStarted, setGameStarted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('highScore') || '0', 10);
  });
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [cameraOffset, setCameraOffset] = useState(0);
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0);
  const [showRevivePopup, setShowRevivePopup] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [hasRevive, setHasRevive] = useState(true);
  
  // New states for addictive features
  const [coins, setCoins] = useState<Coin[]>([]);
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [collectedCoins, setCollectedCoins] = useState(0);
  const [totalCoins, setTotalCoins] = useState(() => {
    return parseInt(localStorage.getItem('totalCoins') || '0', 10);
  });
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [showComboText, setShowComboText] = useState(false);
  const [challenges, setChallenges] = useState<Challenge[]>(() => {
    const saved = localStorage.getItem('challenges');
    return saved ? JSON.parse(saved) : generateDailyChallenges();
  });
  const [selectedSkin, setSelectedSkin] = useState(() => {
    return localStorage.getItem('selectedSkin') || 'pink';
  });
  const [unlockedSkins, setUnlockedSkins] = useState<string[]>(() => {
    const saved = localStorage.getItem('unlockedSkins');
    return saved ? JSON.parse(saved) : ['pink'];
  });
  const [showSkinSelector, setShowSkinSelector] = useState(false);
  const [showChallenges, setShowChallenges] = useState(false);
  const [screenShake, setScreenShake] = useState(0);
  
  // Add these state variables
  const [revives, setRevives] = useState(() => {
    return parseInt(localStorage.getItem('revives') || '0', 10);
  });
  const [showShop, setShowShop] = useState(false);
  
  // Add this state for tracking which challenge was just claimed
  const [justClaimedChallenge, setJustClaimedChallenge] = useState<string | null>(null);
  
  // Player state with new properties
  const [player, setPlayer] = useState<Player>({
    x: 100,
    y: GAME_HEIGHT - 100,
    velocityY: 0,
    velocityX: 0,
    isJumping: false,
    jumpCount: 0,
    rotation: 0,
    color: CHARACTER_SKINS[selectedSkin as keyof typeof CHARACTER_SKINS]?.color || CHARACTER_SKINS.pink.color,
    activeEffects: {
      jumpBoost: 0,
      slowMotion: 0,
      shield: false,
    }
  });
  
  // Refs for animation effects
  const screenShakeRef = useRef({ x: 0, y: 0 });
  
  // Generate daily challenges
  function generateDailyChallenges(): Challenge[] {
    return [
      {
        id: 'collect_coins',
        description: 'Collect 30 coins',
        target: 30,
        progress: 0,
        completed: false,
        claimed: false,
        reward: 12,
      },
      {
        id: 'reach_score',
        description: 'Reach 2000 points',
        target: 2000,
        progress: 0,
        completed: false,
        claimed: false,
        reward: 25,
      },
      {
        id: 'perfect_landings',
        description: 'Get a 5x combo',
        target: 5,
        progress: 0,
        completed: false,
        claimed: false,
        reward: 18,
      },
      // New challenges
      {
        id: 'play_games',
        description: 'Play 3 games today',
        target: 3,
        progress: 0,
        completed: false,
        claimed: false,
        reward: 15,
      },
      {
        id: 'survival',
        description: 'Survive for 60 seconds',
        target: 60,
        progress: 0,
        completed: false,
        claimed: false,
        reward: 20,
      },
      {
        id: 'big_jump',
        description: 'Make 50 jumps',
        target: 50,
        progress: 0,
        completed: false,
        claimed: false,
        reward: 10,
      },
      {
        id: 'collect_powerups',
        description: 'Collect 5 power ups',
        target: 5,
        progress: 0,
        completed: false,
        claimed: false,
        reward: 30,
      }
    ];
  }


  // Check and reset daily challenges
  useEffect(() => {
    const lastCheck = localStorage.getItem('lastChallengeCheck');
    const today = new Date().toDateString();
    
    if (lastCheck !== today) {
      const allChallenges = generateDailyChallenges();
      const shuffled = [...allChallenges].sort(() => 0.5 - Math.random());
      const selectedChallenges = shuffled.slice(0, 3);
      setChallenges(selectedChallenges);
      localStorage.setItem('challenges', JSON.stringify(selectedChallenges));
      localStorage.setItem('lastChallengeCheck', today);
    }
  }, []);
  
  // Save data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('highScore', highScore.toString());
    localStorage.setItem('totalCoins', totalCoins.toString());
    localStorage.setItem('challenges', JSON.stringify(challenges));
    localStorage.setItem('unlockedSkins', JSON.stringify(unlockedSkins));
    localStorage.setItem('selectedSkin', selectedSkin);
    localStorage.setItem('revives', revives.toString());
  }, [highScore, totalCoins, challenges, unlockedSkins, selectedSkin, revives]);
  
  // Platform generation with coins and power-ups
  const generatePlatform = useCallback((lastX: number, lastY?: number, speed = 1.0) => {
    // Original platform generation logic
    const minWidth = 80;
    const maxWidth = 130;
    const width = Math.random() * (maxWidth - minWidth) + minWidth;
    
    const jumpTime = 2 * Math.abs(JUMP_FORCE) / GRAVITY;
    const singleJumpDistance = (MOVE_SPEED * speed) * jumpTime;
    const maxJumpDistance = singleJumpDistance * 1.6;
    
    const baseMinGap = 80;
    const baseMaxGap = Math.min(140, maxJumpDistance - 20);
    
    const minGap = Math.min(baseMinGap * speed, maxJumpDistance * 0.6);
    const maxGap = Math.min(baseMaxGap * speed, maxJumpDistance * 0.9);
    
    const finalMaxGap = Math.max(minGap, maxGap);
    const gap = Math.random() * (finalMaxGap - minGap) + minGap;
    
    const x = lastX + gap;
    
    let y;
    if (lastY) {
      const jumpRange = 150;
      const upOrDown = Math.random() > 0.5;
      
      if (upOrDown && lastY > GAME_HEIGHT / 2) {
        y = Math.max(100, lastY - Math.random() * jumpRange);
      } else {
        y = Math.min(GAME_HEIGHT - 100, lastY + Math.random() * jumpRange);
      }
    } else {
      y = GAME_HEIGHT - 100;
    }
    
    // Determine if this is a special platform
    let platformType: Platform['type'] = 'normal';
    if (Math.random() < SPECIAL_PLATFORM_CHANCE) {
      platformType = Math.random() < 0.5 ? 'moving' : 'disappearing';
    }
    
    // Create the platform object with additional properties
    const platform: Platform = { 
      x, 
      y, 
      width,
      type: platformType
    };
    
    // For moving platforms
    if (platformType === 'moving') {
      platform.direction = Math.random() < 0.5 ? -1 : 1;
      platform.startX = x; // Store the original X position
      platform.moveDistance = Math.min(width * 1.5, 100); // Limit max movement distance based on platform width
    }
    
    // For disappearing platforms
    if (platformType === 'disappearing') {
      platform.visible = true;
      platform.timer = 50; // Will disappear after 5/6 second of landing
    }
    
    return platform;
  }, []);
  
  // Init game function with new features
  const initGame = useCallback(() => {
    setScore(0);
    setCameraOffset(0);
    gameSpeed = 1.0;
    setSpeedMultiplier(1.0);
    setShowRevivePopup(false);
    setIsGameOver(false);
    setHasRevive(true);
    setCombo(0);
    setCoins([]);
    setPowerUps([]);
    setCollectedCoins(0);
    
    // Reset player with selected skin
    setPlayer({
      x: 100,
      y: GAME_HEIGHT - 100,
      velocityY: 0,
      velocityX: MOVE_SPEED,
      isJumping: false,
      jumpCount: 0,
      rotation: 0,
      color: CHARACTER_SKINS[selectedSkin as keyof typeof CHARACTER_SKINS]?.color || CHARACTER_SKINS.pink.color,
      activeEffects: {
        jumpBoost: 0,
        slowMotion: 0,
        shield: false
      }
    });
    
    // Generate initial platforms
    const initialPlatforms: Platform[] = [
      { x: 50, y: GAME_HEIGHT - 50, width: 200, type: 'normal' },
    ];
    
    let lastX = initialPlatforms[0].x + initialPlatforms[0].width;
    let lastY = initialPlatforms[0].y;
    
    for (let i = 0; i < 8; i++) {
      // Initial platforms have speed 1.0
      const platform = generatePlatform(lastX, lastY, 1.0);
      initialPlatforms.push(platform);
      lastX = platform.x + platform.width;
      lastY = platform.y;
    }
    
    setPlatforms(initialPlatforms);
    setGameStarted(true);

    // Update play_games challenge
    setChallenges(prev => prev.map(challenge => {
      if (challenge.id === 'play_games' && !challenge.completed) {
        const newProgress = challenge.progress + 1;
        return {
          ...challenge,
          progress: newProgress,
          completed: newProgress >= challenge.target
        };
      }
      return challenge;
    }));
  }, [generatePlatform, selectedSkin]);
  
  // Enhanced jump function with power-up effects
  const jump = useCallback(() => {
    setPlayer(prev => {
      // Only jump if we haven't used all our jumps
      if (prev.jumpCount < MAX_JUMP_COUNT) {
        // Play jump sound effect
        playSoundEffect('jump');
        
        // Update big_jump challenge
        setChallenges(prev => prev.map(challenge => {
          if (challenge.id === 'big_jump' && !challenge.completed) {
            const newProgress = challenge.progress + 1;
            return {
              ...challenge,
              progress: newProgress,
              completed: newProgress >= challenge.target
            };
          }
          return challenge;
        }));
        
        return {
          ...prev,
          velocityY: JUMP_FORCE * (prev.activeEffects.jumpBoost > 0 ? 1.5 : 1.0),
          isJumping: true,
          jumpCount: prev.jumpCount + 1,
        };
      }
      return prev;
    });
  }, []);
  
  // Key press handler
  useEffect(() => {
    if (!gameStarted) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        jump();
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [gameStarted, jump]);
  
  
  // Main game loop with enhanced features
  useEffect(() => {
    if (!gameStarted || isGameOver) return;
    
    const gameLoop = setInterval(() => {
      // Calculate game speed based on score
      gameSpeed = Math.min(3.0, 1.0 + Math.floor(score / 500) * 0.1);
      // Fix slow motion effect
      let timeScale = player.activeEffects.slowMotion > 0 ? 0.5 : 1.0;
      setSpeedMultiplier(gameSpeed * timeScale);

      // Add music speed adjustment
      gameMusic.playbackRate = 0.4 * gameSpeed;
      
      // Calculate current speed with effects
      const currentSpeed = MOVE_SPEED * gameSpeed * timeScale;
      
      // Update camera position
      setCameraOffset(prev => prev + currentSpeed);
      
      // Update platforms (moving & disappearing)
      setPlatforms(prev => {
        return prev.map(platform => {
          // Handle moving platforms
          if (platform.type === 'moving' && platform.direction) {
            const moveSpeed = 1.0 * timeScale; // Reduced from 1.5 to 1.0 for easier gameplay
            
            // Calculate new position
            const newX = platform.x + platform.direction * moveSpeed;
            
            // Restrict movement to a reasonable range from starting position
            if (platform.startX && platform.moveDistance) {
              // If platform would go beyond allowed range, reverse direction
              if (newX < platform.startX - platform.moveDistance || 
                  newX > platform.startX + platform.moveDistance) {
                platform.direction *= -1; // Reverse direction
              } else {
                platform.x = newX; // Otherwise update position
              }
            } else {
              // Fallback for old platforms without these properties
              platform.x = newX;
            }
          }
          
          // Keep disappearing platforms visible until landed on
          return platform;
        });
      });
      
      // Update player position with enhanced collision detection
      setPlayer(prev => {
        // Apply normal movement
        const newX = prev.x + currentSpeed;
        const newY = prev.y + prev.velocityY;
        const newVelocityY = prev.velocityY + GRAVITY * timeScale;
        
        // Rotation logic
        let newRotation = prev.rotation;
        if (prev.isJumping) {
          newRotation = (prev.rotation + 6) % 360;
        }
        
        // Check platform collisions
        let collision = false;
        let landedPlatform: Platform | null = null;
        
        platforms.forEach(platform => {
          // Skip invisible platforms
          if (platform.type === 'disappearing' && platform.visible === false) {
            return;
          }
          
          if (
            newY + PLAYER_SIZE > platform.y &&
            newY + PLAYER_SIZE < platform.y + PLATFORM_HEIGHT &&
            newX + PLAYER_SIZE > platform.x &&
            newX < platform.x + platform.width &&
            prev.velocityY > 0
          ) {
            collision = true;
            landedPlatform = platform;
          }
        });
        
        // Check coin collisions
        coins.forEach((coin, index) => {
          if (!coin.collected &&
              newX < coin.x + COIN_SIZE &&
              newX + PLAYER_SIZE > coin.x &&
              newY < coin.y + COIN_SIZE &&
              newY + PLAYER_SIZE > coin.y) {
            
            // Collect the coin
            setCoins(prev => prev.map((c, i) => 
              i === index ? { ...c, collected: true } : c
            ));
            
            // Update collected coins
            setCollectedCoins(prev => prev + coin.value);
            setTotalCoins(prev => prev + coin.value);
            
            // Play coin sound
            playSoundEffect('coin');
            
            // Update challenge progress
            setChallenges(prev => prev.map(challenge => {
              if (challenge.id === 'collect_coins' && !challenge.completed) {
                const newProgress = challenge.progress + coin.value;
                return {
                  ...challenge,
                  progress: newProgress,
                  completed: newProgress >= challenge.target
                };
              }
              return challenge;
            }));
          }
        });
        
        // Check power-up collisions
        powerUps.forEach((powerUp, index) => {
          if (!powerUp.collected &&
              newX < powerUp.x + POWERUP_SIZE &&
              newX + PLAYER_SIZE > powerUp.x &&
              newY < powerUp.y + POWERUP_SIZE &&
              newY + PLAYER_SIZE > powerUp.y) {
            
            // Mark as collected
            setPowerUps(prev => prev.map((p, i) => 
              i === index ? { ...p, collected: true } : p
            ));
            
            // Apply power-up effect
            const effectFrames = powerUp.duration * 60; // 60fps * seconds
            
            let updatedEffects = { ...prev.activeEffects };
            
            switch (powerUp.type) {
              case 'jump_boost':
                updatedEffects.jumpBoost = effectFrames;
                break;
              case 'slow_motion':
                updatedEffects.slowMotion = effectFrames;
                break;
              case 'shield':
                updatedEffects.shield = true;
                break;
            }
            
            // Play power-up sound
            playSoundEffect('powerUp');

            // Update powerup challenge
            setChallenges(prev => prev.map(challenge => {
              if (challenge.id === 'collect_powerups' && !challenge.completed) {
                const newProgress = challenge.progress + 1;
                return {
                  ...challenge,
                  progress: newProgress,
                  completed: newProgress >= challenge.target
                };
              }
              return challenge;
            }));
            
            return {
              ...prev,
              activeEffects: updatedEffects
            };
          }
        });
        
        if (collision && landedPlatform) {
          // Only check for perfect landing if this is an actual landing (not sliding)
          const isNewLanding = prev.isJumping;
          
          // Landing logic - snap to a side based on rotation
          const normalizedRotation = ((newRotation % 360) + 360) % 360;
          let nextSide;
          if (normalizedRotation >= 31 && normalizedRotation <= 120) {
            nextSide = 90;
          } else if (normalizedRotation >= 121 && normalizedRotation <= 210) {
            nextSide = 180;
          } else if (normalizedRotation >= 211 && normalizedRotation <= 300) {
            nextSide = 270;
          } else {
            nextSide = 0;
          }
          
          // Perfect landing bonus - ONLY PROCESS FOR NEW LANDINGS
          if (isNewLanding) {
            const isPerfectLanding = Math.abs(normalizedRotation - nextSide) < 15;
            
            if (isPerfectLanding) {
              // Increase combo
              const newCombo = combo + 1;
              setCombo(newCombo);
              setMaxCombo(prev => Math.max(prev, newCombo));
              setShowComboText(true);
              
              // Screen shake intensity based on combo
              const shakeIntensity = Math.min(5, newCombo * 0.5);
              screenShakeRef.current = { 
                x: (Math.random() - 0.5) * shakeIntensity, 
                y: (Math.random() - 0.5) * shakeIntensity 
              };
              
              // Play combo sound with increasing volume
              if (!audioCache['combo']) {
                audioCache['combo'] = new Audio('/combo.mp3');
              }
              audioCache['combo'].volume = Math.min(0.8, 0.3 + (newCombo * 0.05));
              audioCache['combo'].currentTime = 0;
              audioCache['combo'].play().catch(err => console.log('Audio play error:', err));
              
              setTimeout(() => {
                screenShakeRef.current = { x: 0, y: 0 };
                setShowComboText(false);
              }, 800);
              
              playSoundEffect('perfectLanding');
              setScore(prev => prev + Math.min(10, newCombo));
            } else {
              setCombo(0);
            }
          }
          
          // Handle disappearing platforms
          if (landedPlatform && (landedPlatform as Platform).type === 'disappearing') {
            // Start disappearing
            setTimeout(() => {
              setPlatforms(prev => prev.map(p => {
                if (p === landedPlatform) {
                  return { ...p, visible: false };
                }
                return p;
              }));
            }, 500); // Disappear after 0.5 seconds
            
            // Play sound effect for disappearing platform
            playSoundEffect('crumble');
          }
          
          return {
            ...prev,
            x: newX,
            y: (landedPlatform as Platform).y - PLAYER_SIZE + 1,
            velocityY: 0,
            isJumping: false,
            jumpCount: 0,
            rotation: nextSide,
            velocityX: currentSpeed,
          };
        }
        
        // Game over check
        if (newY > GAME_HEIGHT) {
          // Check if shield is active
          if (prev.activeEffects.shield) {
            // Use up shield
            playSoundEffect('shield');
            
            // Create a safe platform
            const safeX = cameraOffset + GAME_WIDTH / 4;
            const safeY = GAME_HEIGHT - 150;
            
            // Add safety platform
            setPlatforms(platforms => [
              ...platforms,
              { x: safeX, y: safeY, width: 200, type: 'normal' }
            ]);
            
            // Position player above platform
            return {
              ...prev,
              activeEffects: { ...prev.activeEffects, shield: false },
              x: safeX + 50,
              y: safeY - PLAYER_SIZE,
              velocityY: 0,
              isJumping: false,
              jumpCount: 0,
              rotation: 0,
            };
          }
          
          // Don't immediately end the game, show revive popup instead
          setShowRevivePopup(true);
          setIsGameOver(true);
          
          
          // Update the game over check to store personal high scores
          if (score > highScore) {
            setHighScore(score);
          }
          

          
          return prev;
        }
        
        return {
          ...prev,
          x: newX,
          y: newY,
          velocityY: newVelocityY,
          rotation: newRotation,
          velocityX: currentSpeed,
        };
      });
      
      // Generate platforms based on camera position
      setPlatforms(prev => {
        const lastPlatform = prev[prev.length - 1];
        if (cameraOffset + GAME_WIDTH > lastPlatform.x) {
          const newPlatform = generatePlatform(lastPlatform.x + lastPlatform.width, lastPlatform.y, gameSpeed);
          
          // Decide what to spawn based on chance constants
          const spawnRoll = Math.random();
          
          // Mutually exclusive spawning (never both on same platform)
          if (spawnRoll < COIN_SPAWN_CHANCE) {
            // Generate coins in one of three patterns
            const patternType = Math.floor(Math.random() * 3);
            
            if (patternType === 0) {
              // Arc pattern between platforms
              const coinCount = 5;
              const startX = lastPlatform.x + lastPlatform.width / 2;
              const endX = newPlatform.x + newPlatform.width / 2;
              const startY = lastPlatform.y - 50;
              const endY = newPlatform.y - 50;
              
              for (let i = 0; i < coinCount; i++) {
                const t = i / (coinCount - 1);
                const coinX = startX + (endX - startX) * t;
                const coinY = startY + (endY - startY) * t - Math.sin(t * Math.PI) * 40;
                setCoins(prev => [...prev, { x: coinX, y: coinY, collected: false, value: 1 }]);
              }
            } else if (patternType === 1) {
              // Row pattern
              const coinCount = 4;
              const startX = lastPlatform.x + lastPlatform.width;
              const spacing = (newPlatform.x - startX) / (coinCount + 1);
              const y = Math.min(lastPlatform.y, newPlatform.y) - 60;
              
              for (let i = 0; i < coinCount; i++) {
                const x = startX + spacing * (i + 1);
                setCoins(prev => [...prev, { x, y, collected: false, value: 1 }]);
              }
            } else {
              // Rectangle pattern
              const rows = 2;
              const cols = 3;
              const startX = (lastPlatform.x + lastPlatform.width + newPlatform.x) / 2 - (cols * 25) / 2;
              const startY = Math.min(lastPlatform.y, newPlatform.y) - 80;
              
              for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                  const x = startX + col * 25;
                  const y = startY + row * 25;
                  setCoins(prev => [...prev, { x, y, collected: false, value: 1 }]);
                }
              }
            }
          } 
          else if (spawnRoll < COIN_SPAWN_CHANCE + POWERUP_SPAWN_CHANCE) {
            // Spawn a power-up
            const powerUpX = (lastPlatform.x + lastPlatform.width + newPlatform.x) / 2;
            const powerUpY = Math.min(lastPlatform.y, newPlatform.y) - 60;
            
            // Randomly choose power-up type
            const types: PowerUp['type'][] = ['jump_boost', 'slow_motion', 'shield'];
            const type = types[Math.floor(Math.random() * types.length)];
            
            setPowerUps(prev => [...prev, {
              x: powerUpX,
              y: powerUpY,
              type,
              collected: false,
              duration: type === 'shield' ? 20 : 5 // Change from 1 to 20 seconds for shield
            }]);
          }
          
          return [...prev.filter(p => p.x + p.width > cameraOffset - 300), newPlatform];
        }
        return prev.filter(p => p.x + p.width > cameraOffset - 300); // Clean up old platforms
      });
      
      // Update score with combo multiplier
      setScore(prev => prev + 1 + Math.floor(combo / 3));
      
      // Update challenge progress for score
      setChallenges(prev => prev.map(challenge => {
        if (challenge.id === 'reach_score' && !challenge.completed) {
          const newProgress = score + 1;
          return {
            ...challenge,
            progress: newProgress,
            completed: newProgress >= challenge.target
          };
        }
        return challenge;
      }));

      // Update survival challenge - count every second
      if (score % 60 === 0) { // Once per second at 60fps
        setChallenges(prev => prev.map(challenge => {
          if (challenge.id === 'survival' && !challenge.completed) {
            const newProgress = challenge.progress + 1;
            return {
              ...challenge,
              progress: newProgress,
              completed: newProgress >= challenge.target
            };
          }
          return challenge;
        }));
      }

      // Add this code to decrease power-up timers:
      setPlayer(prev => {
        // Update power-up durations
        return {
          ...prev,
          activeEffects: {
            jumpBoost: Math.max(0, prev.activeEffects.jumpBoost - 1),
            slowMotion: Math.max(0, prev.activeEffects.slowMotion - 1),
            shield: prev.activeEffects.shield // Shield doesn't have a timer
          }
        };
      });
      
    }, 1000 / 60);
    
    return () => clearInterval(gameLoop);
  }, [gameStarted, isGameOver, generatePlatform, platforms, cameraOffset, score, player, coins, powerUps, screenShake, combo]);
  
  // Handle revive function
  const handleRevive = useCallback(() => {
    setShowRevivePopup(false);
    setIsGameOver(false);
    
    if (revives > 0) {
      setRevives(prev => prev - 1);
    } else {
      setHasRevive(false); // For compatibility with the existing ad-based revival
    }
    
    gameSpeed = Math.max(1.0, gameSpeed - 0.5);
    setSpeedMultiplier(gameSpeed);
    
    const safeX = cameraOffset + GAME_WIDTH / 4;
    const safeY = GAME_HEIGHT - 150;
    const safePlatform = { 
      x: safeX, 
      y: safeY, 
      width: 200,
      type: 'normal' as const
    };
    
    setPlayer({
      ...player,
      x: safeX + 50,
      y: safeY - PLAYER_SIZE,
      velocityY: 0,
      velocityX: MOVE_SPEED * gameSpeed,
      isJumping: false,
      jumpCount: 0,
      rotation: 0,
    });
    
    setPlatforms([
      safePlatform,
      ...Array.from({ length: 5 }, (_, i) => {
        const lastX = i === 0 ? safePlatform.x + safePlatform.width : safePlatform.x + safePlatform.width + i * 200;
        return generatePlatform(lastX, GAME_HEIGHT - 150 + (Math.random() * 100 - 50), gameSpeed);
      })
    ]);
    
    setCameraOffset(safeX - GAME_WIDTH / 4);
    
    // Reset combo on revive
    setCombo(0);
  }, [cameraOffset, player, generatePlatform, revives]);
  
  // End game
  const handleSkipRevive = useCallback(() => {
    setShowRevivePopup(false);
    setGameStarted(false);
    setHighScore(prev => Math.max(prev, score));
  }, [score]);
  
  // Unlock a new skin - update to properly validate coin balance
  const unlockSkin = useCallback((skin: string) => {
    const skinPrice = 1000; // Skin price is 1000 coins
    
    if (!unlockedSkins.includes(skin) && totalCoins >= skinPrice) {
      setUnlockedSkins(prev => [...prev, skin]);
      setTotalCoins(prev => prev - skinPrice);
      playSoundEffect('unlock');
      return true; // Purchase successful
    } else {
      playSoundEffect('error');
      return false; // Purchase failed
    }
  }, [unlockedSkins, totalCoins]);

  // Select a skin
  const selectSkin = useCallback((skin: string) => {
    setSelectedSkin(skin);
  }, []);

  // Complete challenge and claim reward
  const completeChallenge = useCallback((challengeId: string) => {
    setChallenges(prev => prev.map(challenge => {
      if (challenge.id === challengeId && challenge.completed && !challenge.claimed) {
        setTotalCoins(coins => coins + challenge.reward);
        playSoundEffect('reward');
        // Set the just claimed challenge to show double reward popup
        setJustClaimedChallenge(challengeId);
        return { ...challenge, claimed: true };
      }
      return challenge;
    }));
  }, []);

  // Add a new function for double rewards
  const doubleReward = useCallback((challengeId: string) => {
    setWatchingAd(true);
    setAdReward({ type: 'doubleReward', challengeId });
    setAdTimer(0);
    setJustClaimedChallenge(null); // Reset after starting the ad
  }, []);

  // Handle touch for mobile
  const handleTouchStart = useCallback(() => {
    if (gameStarted && player.jumpCount < MAX_JUMP_COUNT) {
      jump();
    }
  }, [gameStarted, jump, player.jumpCount]);

  // Add these to your state variables
  const [watchingAd, setWatchingAd] = useState(false);
  const [adTimer, setAdTimer] = useState(0);
  const [adReward, setAdReward] = useState<{type: 'revive' | 'doubleReward', challengeId?: string} | null>(null);
    useEffect(() => {
      const switchMusic = () => {
        if (gameStarted) {
          menuMusic.pause();
          menuMusic.currentTime = 0;
          gameMusic.volume = 0.4;
          gameMusic.play().catch(err => console.log("Game music error"));
        } else {
          gameMusic.pause();
          gameMusic.currentTime = 0;
          menuMusic.volume = 0.4;
          menuMusic.play().catch(err => console.log("Menu music error"));
        }
      };
    
      // Switch music when game state changes
      switchMusic();
    
      // Enable audio on first click
      const enableAudio = () => {
        switchMusic();
        document.removeEventListener('click', enableAudio);
      };
      document.addEventListener('click', enableAudio);
    
      // Cleanup function
      return () => {
        document.removeEventListener('click', enableAudio);
      };
    }, [gameStarted]);

  // Add this effect to simulate ads
  useEffect(() => {
    if (watchingAd) {
      const timer = setTimeout(() => {
        setAdTimer(prev => {
          if (prev < 5) {
            return prev + 1;
          } else {
            // Ad finished
            setWatchingAd(false);
            
            // Process reward
            if (adReward) {
              if (adReward.type === 'revive') {
                handleRevive();
              } else if (adReward.type === 'doubleReward' && adReward.challengeId) {
                // Double the reward
                setChallenges(prev => prev.map(challenge => {
                  if (challenge.id === adReward.challengeId && challenge.completed && !challenge.claimed) {
                    setTotalCoins(coins => coins + challenge.reward * 2);
                    playSoundEffect('reward');
                    return { ...challenge, claimed: true };
                  }
                  return challenge;
                }));
              }
            }
            
            setAdReward(null);
            return 0;
          }
        });
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [watchingAd, adTimer, adReward]);

  // Add this to simulate watching an ad for revival
  const handleWatchAdForRevive = () => {
    setWatchingAd(true);
    setAdReward({ type: 'revive' });
    setAdTimer(0);
  };

  // Function to buy a revive
  const buyRevive = () => {
    const revivePrice = 200;
    
    if (totalCoins >= revivePrice) {
      setRevives(prev => prev + 1);
      setTotalCoins(prev => prev - revivePrice);
      playSoundEffect('purchase');
    } else {
      playSoundEffect('error');
    }
  };

  return (
    <div className="h-screen w-screen bg-gray-900 overflow-hidden relative">
      {/* Add this right at the beginning of your game container */}
      {gameStarted && (
        <div className="absolute top-0 left-0 right-0 bg-black h-12 flex items-center justify-center" style={{ zIndex: 15 }}>
          <div className="text-white text-sm animate-pulse">
            Advertisement - Tap to download Game X
          </div>
          <button 
            className="absolute right-2 text-white text-xs bg-gray-700 px-1 rounded"
            onClick={(e) => e.stopPropagation()}
          >
            X
          </button>
        </div>
      )}
      {/* Game screen shake */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          transform: `translate(${screenShakeRef.current.x}px, ${screenShakeRef.current.y}px)`,
        }}
      >
        {/* Game container */}
        <div 
          className="relative overflow-hidden" 
          style={{ 
            width: GAME_WIDTH, 
            height: GAME_HEIGHT, 
            touchAction: 'none',
            background: `url('${chosenBackground}') repeat-x center`,
            // Zoom it out more by reducing backgroundSize
            backgroundSize: '1100px auto',
            // Shift background position as the camera moves (side scroll)
            backgroundPositionX: `-${cameraOffset * 0.3}px`,
            imageRendering: 'pixelated',
          }}
          onTouchStart={handleTouchStart}
          onClick={jump}  /* <-- Clicking on the container triggers a jump */
        >
          {/* Particle background */}
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 50 }).map((_, i) => (
              <div 
                key={i}
                className="absolute rounded-full bg-white/30"
                style={{
                  width: Math.random() * 10 + 2,
                  height: Math.random() * 10 + 2,
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  opacity: Math.random() * 0.5 + 0.1,
                  animation: `floatAnimation ${Math.random() * 3 + 2}s ease-in-out infinite`,
                  animationDelay: `${Math.random() * 5}s`,
                }}
              />
            ))}
          </div>
          
          {gameStarted ? (
            <>
              {/* Score and coin display */}
              <div className="fixed top-16 right-80 z-10">
                <div className="bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-2 rounded-full shadow-lg border border-white/30 backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-white">
                      Score: {score} <span className="text-xs opacity-80">/ {highScore}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="fixed top-16 left-80 z-10">
                <div className="bg-gradient-to-r from-yellow-500 to-amber-600 px-4 py-2 rounded-full shadow-lg border border-white/30 backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl"><GOLDEN_COIN_SMALL /></span>
                    <span className="text-xl font-bold text-white">{totalCoins}</span>
                  </div>
                </div>
              </div>

              {/* Combo indicator */}
              {combo > 1 && (
                <div 
                  className="fixed top-28 right-80 z-10"
                  style={{
                    animation: combo > 3 ? 'pulse 0.5s infinite' : undefined
                  }}
                >
                  <div className={`bg-gradient-to-r ${
                    combo > 5 ? 'from-purple-500 to-indigo-600' :
                    combo > 3 ? 'from-blue-500 to-indigo-600' : 
                    'from-indigo-500 to-blue-600'
                  } px-4 py-1 rounded-full shadow-lg border border-white/30 backdrop-blur-sm`}>
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      <span className="text-white font-bold">
                        {combo}x <span className="text-xs opacity-80">Combo</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Game content - platforms, player, coins, etc. */}
              <div className="relative" style={{ transform: `translateX(-${cameraOffset}px)` }}>
                {/* Platforms */}
                {platforms.map((platform, i) => (
                  <div
                    key={i}
                    className={`absolute rounded-lg ${platform.type === 'disappearing' ? 'animate-pulse' : ''}`}
                    style={{
                      left: platform.x,
                      top: platform.y,
                      width: platform.width,
                      height: PLATFORM_HEIGHT,
                      background: platform.type === 'normal'
                        ? 'linear-gradient(to right, #FF6B6B, #FFE66D)'
                        : platform.type === 'moving'
                          ? 'linear-gradient(to right, #4ECDC4, #1A535C)' 
                          : 'linear-gradient(to right, #FF9A8B, #FF6A88)',
                      boxShadow: platform.type === 'normal'
                        ? '0 4px 15px rgba(255,107,107,0.5)'
                        : platform.type === 'moving'
                          ? '0 4px 15px rgba(78,205,196,0.5)'
                          : '0 4px 15px rgba(255,154,139,0.5)',
                      border: '2px solid rgba(255,255,255,0.7)',
                      display: platform.type === 'disappearing' && platform.visible === false ? 'none' : 'block',
                      transform: platform.type === 'moving' ? 'translateY(-2px)' : 'none',
                      transition: 'transform 0.3s',
                    }}
                  >
                    {/* Platform pattern */}
                    <div className="h-1/2 w-full flex">
                      {Array.from({ length: Math.ceil(platform.width / 20) }).map((_, i) => (
                        <div 
                          key={i}
                          className="h-full" 
                          style={{ 
                            width: 20, 
                            background: platform.type === 'normal' 
                              ? 'rgba(255,255,255,0.2)' 
                              : platform.type === 'moving' 
                                ? 'rgba(255,255,255,0.3)' 
                                : 'rgba(255,255,255,0.15)', 
                            marginLeft: i % 2 === 0 ? 0 : 10,
                            opacity: 0.3
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}

                {/* Coins */}
                {coins.filter(coin => !coin.collected).map((coin, i) => (
                  <div
                    key={`coin-${i}`}
                    className="absolute"
                    style={{
                      left: coin.x,
                      top: coin.y,
                      width: COIN_SIZE,
                      height: COIN_SIZE,
                      animation: 'float 2s ease-in-out infinite',
                      zIndex: 5,
                    }}
                  >
                    <div className="w-full h-full relative">
                      {/* Outer glow */}
                      <div className="absolute inset-0 rounded-full" 
                        style={{ 
                          background: coin.value > 1 ? 'radial-gradient(circle, rgba(255,215,0,0.5) 0%, rgba(255,215,0,0) 70%)' : 'none',
                          transform: 'scale(1.5)',
                        }}
                      />
                      
                      {/* Coin */}
                      <div className="absolute inset-0 rounded-full flex items-center justify-center border-2" 
                        style={{
                          background: coin.value > 1 
                            ? 'linear-gradient(45deg, #FFD700, #FFC800, #FFBF00, #FFD700)'
                            : 'linear-gradient(45deg, #FFC107, #FFD54F)',
                          boxShadow: coin.value > 1 
                            ? '0 0 15px rgba(255,215,0,0.8), inset 0 0 8px rgba(255,255,255,0.5)' 
                            : '0 0 10px rgba(255,215,0,0.5), inset 0 0 5px rgba(255,255,255,0.3)',
                          borderColor: 'rgba(255,255,255,0.8)',
                          animation: 'spin 4s linear infinite',
                        }}
                      >
                        {coin.value > 1 && <span className="text-xs font-bold text-amber-900">5x</span>}
                      </div>
                    </div>
                  </div>
                ))}


                {/* Power-ups */}
                {powerUps.filter(powerUp => !powerUp.collected).map((powerUp, i) => (
                  <div
                    key={`powerup-${i}`}
                    className="absolute overflow-hidden rounded-full"
                    style={{
                      left: powerUp.x,
                      top: powerUp.y,
                      width: POWERUP_SIZE,
                      height: POWERUP_SIZE,
                      boxShadow: 'none', // remove black shadows
                      zIndex: 6,
                    }}
                  >
                    <img 
                      src={POWERUP_IMAGES[powerUp.type] || POWERUP_IMAGES.shield}
                      alt={powerUp.type}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
                
                {/* Render Player */}
                <div
                  className="absolute"
                  style={{
                    left: player.x,
                    top: player.y,
                    width: PLAYER_SIZE,
                    height: PLAYER_SIZE,
                    transform: `rotate(${player.rotation}deg)`,
                    transition: 'none',
                    willChange: 'transform',
                    borderRadius: '10%',
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={CHARACTER_SKINS[selectedSkin as keyof typeof CHARACTER_SKINS].image}
                    alt="Player Sprite"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            </>
          ) : (
            /* Main MENU */
            <div>
              {/* Main Menu BG */}
              <img
                src="/main-menu.png"
                alt="Main Menu Background"
                className="absolute"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  zIndex: 0,
                }}
              />

              {/* Menu & buttons on top */}
              <div className="relative z-10 flex flex-col items-center">
                
                {/* Game logo */}
                <div className="relative mb-8">
                  <h1 className="text-6xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-500 to-indigo-500 tracking-tighter">
                    PIXEL JUMPER
                  </h1>
                  <div className="w-32 h-1 mx-auto bg-gradient-to-r from-pink-500 to-indigo-500 rounded-full"></div>
                </div>
                
                {/* Move high score & coins to top so they don't block the character */}
                <div className="absolute top-20 left-0 right-0 flex items-center justify-center gap-6 z-10">
                  <div className="text-white bg-black/20 backdrop-blur-sm py-2 px-4 rounded-xl shadow-lg flex items-center gap-2">
                    <span className="text-3xl font-bold text-purple-300">High Score:</span>
                    <span className="text-4xl font-bold text-yellow-300">{highScore}</span>
                  </div>
                  <div className="text-white bg-black/20 backdrop-blur-sm py-2 px-4 rounded-xl shadow-lg flex items-center gap-2">
                    <span className="text-3xl"><GOLDEN_COIN_BIG /></span>
                    <span className="text-4xl font-bold text-yellow-400">{totalCoins}</span>
                  </div>
                </div>
                <div className="h-60"></div>
                <div className="grid grid-cols-2 gap-4 mb-8 max-w-lg w-full">
                  <button
                    className="group relative px-12 py-6 rounded-2xl text-3xl font-extrabold transition-all duration-300 overflow-hidden shadow-lg hover:scale-105"
                    onClick={(e) => {
                      e.stopPropagation(); // Stop the click from reaching the game container
                      initGame();
                    }}
                  >
                    
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-600 opacity-80 group-hover:opacity-100 transition-opacity"></div>
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <span className="relative flex items-center justify-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" 
                        />
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                        />
                      </svg>
                      Play
                    </span>
                  </button>
                  
                  <button
                    className="group relative px-8 py-4 rounded-xl text-xl font-bold transition-all duration-300 overflow-hidden"
                    onClick={() => setShowSkinSelector(true)}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-teal-400 opacity-80 group-hover:opacity-100 transition-opacity"></div>
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <span className="relative">Skins</span>
                  </button>
                  
                  <button
                    className="group relative px-8 py-4 rounded-xl text-xl font-bold transition-all duration-300 overflow-hidden"
                    onClick={() => setShowChallenges(true)}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-orange-500 opacity-80 group-hover:opacity-100 transition-opacity"></div>
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <span className="relative">Challenges</span>
                  </button>
                  
                  <button
                    className="group relative px-8 py-4 rounded-xl text-xl font-bold transition-all duration-300 overflow-hidden"
                    onClick={() => setShowShop(true)}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-80 group-hover:opacity-100 transition-opacity"></div>
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <span className="relative">Shop</span>
                  </button>
                </div>
                
                <div className="text-center text-white/80 bg-black/30 backdrop-blur-sm px-6 py-3 rounded-xl">
                  <p>Press <span className="bg-white/20 px-2 py-1 rounded">SPACE</span> to jump. Double jump for extra height!</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Revive Popup */}
      {showRevivePopup && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center" style={{ zIndex: 20 }}>
          <div className="bg-white rounded-lg p-8 max-w-md text-center">
            <h2 className="text-3xl font-bold mb-4 text-pink-500">Game Over!</h2>
            <p className="text-xl mb-6">Current Score: {score}</p>
            <p className="text-lg mb-4">Revives Available: {revives}</p>
            
            <div className="flex flex-wrap justify-center gap-4">
              {revives > 0 && (
                <button 
                  onClick={handleRevive}
                  className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded-lg text-white font-bold hover:from-pink-600 hover:to-purple-600"
                >
                  Use Revive ({revives})
                </button>
              )}
              <button 
                onClick={handleWatchAdForRevive}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg text-white font-bold hover:from-green-600 hover:to-blue-600 flex items-center"
              >
                <span className="mr-2">📺</span> Revive (Watch Ad)
              </button>
              <button 
                onClick={handleSkipRevive}
                className="px-6 py-3 bg-gray-200 rounded-lg text-gray-800 font-bold hover:bg-gray-300"
              >
                End Game
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Skin selector modal */}
      {showSkinSelector && (
        <div className="absolute inset-0 flex items-center justify-center z-20" style={{ backdropFilter: 'blur(5px)' }}>
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowSkinSelector(false)} />
          <div className="bg-gradient-to-b from-gray-900 to-gray-800 p-8 rounded-xl border border-white/20 shadow-2xl max-w-2xl w-full mx-4 relative">
            {/* Top ribbon */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500"></div>
            
            {/* Add this close button */}
            <button 
              className="absolute top-44 right-2 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
              onClick={() => setShowSkinSelector(false)}
            >
              ×
            </button>
            
            <h2 className="text-3xl font-bold mb-1 text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-600">Character Skins</h2> 
            <p className="text-gray-400 mb-6">Customize your jumper's appearance</p>
            
            <div className="flex items-center justify-between mb-6 p-4 bg-black/30 rounded-lg">
              <span className="text-gray-300">Available Coins</span>
              <span className="text-xl font-bold text-yellow-400 flex items-center gap-2">
                <span className="text-2xl"><GOLDEN_COIN_SMALL /></span> {totalCoins}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              {Object.entries(CHARACTER_SKINS).map(([skinName, color]) => (
                <div 
                  key={skinName}
                  className={`p-4 rounded-lg cursor-pointer transition-all ${
                    unlockedSkins.includes(skinName) 
                      ? selectedSkin === skinName 
                        ? 'bg-green-100 border-2 border-green-500' 
                        : 'bg-gray-100 hover:bg-gray-200' 
                      : 'bg-gray-100 opacity-75'
                  }`}
                  onClick={() => {
                    if (unlockedSkins.includes(skinName)) {
                      selectSkin(skinName);
                    } else if (totalCoins >= 1000) {
                      // Now checking for 1000 coins (matching the price)
                      const success = unlockSkin(skinName);
                      if (success) {
                        selectSkin(skinName);
                      }
                    } else {
                      playSoundEffect('error');
                    }
                  }}
                >
                  <div 
                    className="w-20 h-20 mx-auto mb-2 rounded-lg relative"
                    style={{ background: color.color }}
                  >
                    {/* Face features */}
                    <div className="absolute w-4 h-4 bg-black rounded-full" style={{ top: '25%', left: '25%' }}></div>
                    <div className="absolute w-4 h-4 bg-black rounded-full" style={{ top: '25%', right: '25%' }}></div>
                    <div className="absolute w-8 h-4 bg-pink-700 rounded-b-lg" style={{ bottom: '30%', left: '30%' }}></div>
                  </div>
                  
                  <p className="capitalize text-lg font-medium">{skinName}</p>
                  
                  {!unlockedSkins.includes(skinName) && (
                    <p className="text-yellow-600 font-bold mt-1">
                      1000 <GOLDEN_COIN_SMALL />
                    </p>
                  )}
                </div>
              ))}
            </div>
            
            <div className="flex justify-end">
              <button
                className="px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-900 rounded-lg text-white font-bold hover:from-gray-800 hover:to-gray-950 transition-all border border-white/10 shadow-lg"
                onClick={() => setShowSkinSelector(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Challenges modal */}
      {showChallenges && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center" style={{ zIndex: 20 }}>
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full text-center">
            <h2 className="text-3xl font-bold mb-4 text-pink-500">Daily Challenges</h2>
            
            <div className="grid grid-cols-1 gap-4 mb-6">
              {challenges.map((challenge, i) => (
                <div 
                  key={i}
                  className={`p-4 rounded-lg transition-all ${
                    challenge.completed 
                      ? challenge.claimed
                        ? 'bg-gray-100' 
                        : 'bg-green-100'
                      : 'bg-blue-50'
                  }`}
                >
                  <p className="text-lg font-medium">{challenge.description}</p>
                  
                  <div className="w-full bg-gray-200 rounded-full mt-2">
                    <div 
                      className="h-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                      style={{ width: `${Math.min(100, (challenge.progress / challenge.target) * 100)}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between items-center mt-2">
                    <p>{challenge.progress} / {challenge.target}</p>
                    
                    {challenge.completed ? (
                      challenge.claimed ? (
                        <span className="px-3 py-1 bg-gray-200 text-gray-600 rounded-lg">
                          Claimed
                        </span>
                      ) : (
                        <button 
                          className="px-3 py-1 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                          onClick={() => completeChallenge(challenge.id)}
                        >
                          Claim {challenge.reward} <GOLDEN_COIN_SMALL />
                        </button>
                      )
                    ) : (
                      <span className="px-3 py-1 bg-blue-500 text-white rounded-lg">
                        In Progress
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <button
              className="px-6 py-3 bg-gray-200 rounded-lg text-gray-800 font-bold hover:bg-gray-300"
              onClick={() => setShowChallenges(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
      {justClaimedChallenge && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-30">
          <div className="bg-white p-6 rounded-lg max-w-sm w-full text-center relative">
            {/* Small X in the corner */}
            <button 
              className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300"
              onClick={() => setJustClaimedChallenge(null)}
            >
              ×
            </button>
            
            <div className="text-2xl mb-2">🎉 Reward Claimed!</div>
            <p className="mb-6">Double your reward with a quick ad!</p>
            
            <button 
              className="w-full py-4 bg-green-500 text-white text-xl rounded-lg flex items-center justify-center hover:bg-green-600 transition-colors"
              onClick={() => doubleReward(justClaimedChallenge)}
            >
              <span className="mr-2 text-2xl">📺</span> Watch Ad
            </button>
          </div>
        </div>
      )}
      {watchingAd && (
        <div className="absolute inset-0 bg-black flex flex-col items-center justify-center z-50">
          <div className="text-white text-2xl mb-8">Watching Ad... {adTimer}/5</div>
          <div className="w-64 h-64 bg-gradient-to-br from-blue-400 to-purple-600 rounded-lg flex items-center justify-center animate-pulse">
            <div className="text-white text-xl font-bold">Sample Game Ad</div>
          </div>
          <div className="mt-4 text-gray-300">Please wait...</div>
        </div>
      )}

      {/* Shop modal */}
      {showShop && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center" style={{ zIndex: 20 }}>
          <div className="bg-white rounded-lg p-8 max-w-md w-full text-center">
            <h2 className="text-3xl font-bold mb-4 text-emerald-500">Shop</h2>
            <p className="text-lg mb-6">Available Coins: {totalCoins} <GOLDEN_COIN_SMALL /></p>
            
            <div className="border rounded-lg p-4 mb-6 bg-gray-50">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="bg-red-500 w-10 h-10 rounded-full flex items-center justify-center text-white text-lg mr-3">❤️</div>
                  <div className="text-left">
                    <p className="font-bold text-lg">Extra Life</p>
                    <p className="text-gray-600">Continue where you left off</p>
                  </div>
                </div>
                
                <div>
                  <p className="font-bold text-lg mb-1">200 <GOLDEN_COIN_SMALL /></p>
                  <button 
                    className={`px-3 py-1 rounded-lg text-white ${totalCoins >= 200 ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-gray-400'}`}
                    onClick={buyRevive}
                    disabled={totalCoins < 200}
                  >
                    Buy
                  </button>
                </div>
              </div>
              
              <div className="mt-3 text-left">
                <p className="text-gray-500">Current lives: {revives}</p>
              </div>
            </div>
            
            <button
              className="px-6 py-3 bg-gray-200 rounded-lg text-gray-800 font-bold hover:bg-gray-300"
              onClick={() => setShowShop(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}