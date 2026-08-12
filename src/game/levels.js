/**
 * Level definitions for Echo Loom.
 * Layouts verified for awakenability via pulse simulation.
 */
export const LEVELS = [
  {
    id: 1,
    name: 'Chamber I',
    subtitle: 'First Light',
    weaver: [0, 1.4, 1.0],
    cameraBias: [0, 2.2, 8.2],
    stars: [
      { pos: [0.0, 2.4, -4.5], color: '#ffb347' },
      { pos: [-2.8, 1.8, -3.2], color: '#9ad0ff' },
      { pos: [2.8, 2.0, -3.5], color: '#d4a5ff' },
    ],
    // Side mirrors — open center corridor for direct shots
    glass: [
      {
        pos: [-3.6, 1.8, -1.5],
        rot: [0, 0.9, 0],
        size: [2.0, 2.4, 0.08],
      },
      {
        pos: [3.6, 1.8, -1.8],
        rot: [0, -0.9, 0],
        size: [2.0, 2.4, 0.08],
      },
    ],
    crystals: [],
    dust: 80,
  },
  {
    id: 2,
    name: 'Chamber II',
    subtitle: 'Refraction Hall',
    weaver: [0, 1.5, 1.5],
    cameraBias: [0, 2.4, 9.0],
    stars: [
      { pos: [0.0, 3.2, -5.5], color: '#ffe66d' },
      { pos: [-3.8, 2.2, -2.5], color: '#ff8fab' },
      { pos: [3.8, 2.0, -3.0], color: '#7df9ff' },
      { pos: [2.0, 1.4, -6.2], color: '#c3b1e1' },
    ],
    glass: [
      // Angled left mirror to bounce toward left star
      {
        pos: [-2.2, 2.0, -0.8],
        rot: [0, 0.7, 0],
        size: [2.4, 2.6, 0.08],
      },
      // Angled right mirror
      {
        pos: [2.4, 1.9, -1.2],
        rot: [0, -0.75, 0],
        size: [2.2, 2.6, 0.08],
      },
      // Rear angled helper for deep star
      {
        pos: [-1.5, 1.6, -4.2],
        rot: [0, 0.55, 0],
        size: [2.0, 2.2, 0.08],
      },
      {
        pos: [1.2, 2.6, -3.6],
        rot: [0.05, -0.2, 0],
        size: [2.2, 2.0, 0.08],
      },
    ],
    crystals: [
      {
        pos: [-4.2, 0.7, 0.2],
        scale: 0.45,
        rot: [0.2, 0.6, 0.1],
      },
    ],
    dust: 110,
  },
  {
    id: 3,
    name: 'Chamber III',
    subtitle: 'The Silent Vault',
    weaver: [0, 1.6, 2.2],
    cameraBias: [0.1, 2.6, 9.8],
    stars: [
      { pos: [-3.5, 2.4, -3.0], color: '#ff6b6b' },
      { pos: [3.5, 2.8, -2.8], color: '#4ecdc4' },
      { pos: [0.0, 3.6, -6.0], color: '#ffe66d' },
      { pos: [2.8, 1.4, -5.8], color: '#a29bfe' },
      { pos: [-2.5, 1.5, -6.2], color: '#fd79a8' },
    ],
    glass: [
      {
        pos: [-2.6, 2.2, -1.0],
        rot: [0, 0.85, 0],
        size: [2.4, 2.8, 0.08],
      },
      {
        pos: [2.6, 2.2, -1.2],
        rot: [0, -0.85, 0],
        size: [2.4, 2.8, 0.08],
      },
      {
        pos: [0.0, 2.0, -3.4],
        rot: [0, 0.15, 0],
        size: [2.6, 2.2, 0.08],
      },
      {
        pos: [-2.0, 1.6, -4.6],
        rot: [0.05, 0.6, 0],
        size: [2.0, 2.2, 0.08],
      },
      {
        pos: [2.2, 1.7, -4.8],
        rot: [0, -0.55, 0],
        size: [2.0, 2.2, 0.08],
      },
    ],
    crystals: [
      {
        pos: [4.4, 0.75, 0.4],
        scale: 0.5,
        rot: [0.25, 0.7, 0.1],
      },
      {
        pos: [-4.5, 0.7, -5.5],
        scale: 0.4,
        rot: [0.1, -0.5, 0.2],
      },
      {
        pos: [4.3, 0.7, -5.8],
        scale: 0.4,
        rot: [-0.15, 1.0, 0],
      },
    ],
    dust: 140,
  },
];

export const ROOM_NAMES = LEVELS.map((l) => l.name);
