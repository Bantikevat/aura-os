/**
 * AURA Master Header Orchestrator
 * Assembles all luxury components, manages responsiveness & accessibility
 */
import { createAuraLogo } from './AuraLogo.js';
import { createCommandBar } from './UniversalCommandBar.js';
import { createVoiceControl } from './VoiceControl.js';
import { createVisionControl } from './VisionControl.js';
import { createNotificationCenter } from './NotificationCenter.js';
import { createThemeControl } from './ThemeControl.js';
import { createFocusModeControl } from './FocusModeControl.js';
import { createClockDisplay } from './ClockDisplay.js';
import { createProfileMenu } from './ProfileMenu.js';

export function mountAuraHeader({ targetElement, onNavigate, speakFn, onToggleCamera, onToggleScreen }) {
  if (!targetElement) return;

  targetElement.innerHTML = '';
  targetElement.className = 'aura-luxury-header';

  // Left Section
  const leftSection = document.createElement('div');
  leftSection.className = 'header-section-left';
  leftSection.appendChild(createAuraLogo(onNavigate));

  // Center Section (Universal Command Bar)
  const centerSection = document.createElement('div');
  centerSection.className = 'header-section-center';
  centerSection.appendChild(createCommandBar(onNavigate, speakFn));

  // Right Section (Actions & Controls)
  const rightSection = document.createElement('div');
  rightSection.className = 'header-section-right';
  rightSection.appendChild(createClockDisplay());
  rightSection.appendChild(createVisionControl(onToggleCamera, onToggleScreen));
  rightSection.appendChild(createVoiceControl((text) => {
    const cmdInput = document.getElementById('universalCmdInput');
    if (cmdInput) {
      cmdInput.value = text;
      cmdInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    }
  }));
  rightSection.appendChild(createNotificationCenter(onNavigate));
  rightSection.appendChild(createFocusModeControl(speakFn));
  rightSection.appendChild(createThemeControl());
  rightSection.appendChild(createProfileMenu(onNavigate, speakFn));

  targetElement.appendChild(leftSection);
  targetElement.appendChild(centerSection);
  targetElement.appendChild(rightSection);

  console.log('[AURA LUXURY HEADER] Mounted and connected to live state & APIs.');
}
